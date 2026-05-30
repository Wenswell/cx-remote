import { existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/config.js';
import { resolveWorkspacePath } from '../config/config.js';
import type { CodexEvent, ControlBinding, ControlType, Message, Session } from '../domain/types.js';
import type { Store } from '../store/store.js';
import { truncate } from '../utils.js';
import { logger } from '../logger.js';
import { CodexRuntime } from '../agents/codex/runtime.js';
import { EventBus } from './event-bus.js';
import { PermissionService } from './permissions.js';

type RuntimeEntry = {
  runtime: CodexRuntime;
  output: string;
};

export class ControlHub {
  private readonly runtimes = new Map<string, RuntimeEntry>();

  constructor(
    readonly config: AppConfig,
    readonly store: Store,
    readonly events: EventBus,
    readonly permissions: PermissionService,
  ) {}

  stats(): { sessions: number; messages: number; pendingApprovals: number; runtimes: number } {
    return {
      ...this.store.stats(),
      runtimes: this.runtimes.size,
    };
  }

  createSession(input: {
    cwd: string;
    title?: string;
    bind?: { controlType: ControlType; externalId: string };
    bypassApprovalsAndSandbox?: boolean;
  }): Session {
    const cwd = resolveWorkspacePath(this.config, input.cwd);
    if (!existsSync(cwd)) throw new Error(`Path does not exist: ${cwd}`);
    if (!statSync(cwd).isDirectory()) throw new Error(`Path is not a directory: ${cwd}`);

    const now = Date.now();
    const session: Session = {
      id: randomUUID(),
      title: input.title?.trim() || basename(cwd) || cwd,
      cwd,
      agent: 'codex',
      status: 'idle',
      codexThreadId: null,
      currentTurnId: null,
      config: {
        model: emptyToUndefined(this.config.agents.codex.model),
        reasoningEffort: emptyToUndefined(this.config.agents.codex.reasoningEffort),
        approvalPolicy: this.config.agents.codex.approvalPolicy,
        sandbox: this.config.agents.codex.sandbox,
        search: this.config.agents.codex.search,
        bypassApprovalsAndSandbox: input.bypassApprovalsAndSandbox ?? false,
      },
      createdAt: now,
      updatedAt: now,
      lastError: null,
    };
    this.store.createSession(session);
    this.events.publish({ type: 'session.created', sessionId: session.id, payload: { session } });

    if (input.bind) {
      this.bindControl(input.bind.controlType, input.bind.externalId, session.id);
    }

    logger.info('session created', { sessionKey: session.id, cwd });
    return session;
  }

  getSession(id: string): Session {
    const session = this.store.getSession(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  }

  listSessions(): Session[] {
    return this.store.listSessions();
  }

  listMessages(sessionId: string, limit = 200): Message[] {
    this.getSession(sessionId);
    return this.store.listMessages(sessionId, limit);
  }

  bindControl(controlType: ControlType, externalId: string, sessionId: string): ControlBinding {
    this.getSession(sessionId);
    const now = Date.now();
    const binding = this.store.upsertBinding({
      id: randomUUID(),
      controlType,
      externalId,
      sessionId,
      createdAt: now,
      updatedAt: now,
    });
    this.events.publish({ type: 'session.updated', sessionId, payload: { binding } });
    return binding;
  }

  getBinding(controlType: ControlType, externalId: string): ControlBinding | null {
    return this.store.getBinding(controlType, externalId);
  }

  listBindings(controlType?: ControlType): ControlBinding[] {
    return this.store.listBindings(controlType);
  }

  async sendMessage(sessionId: string, text: string, source: ControlType): Promise<Message> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message text is required');
    const session = this.getSession(sessionId);
    if (session.status === 'running') throw new Error('Session is already running');

    const userMessage = this.addMessage({
      sessionId,
      role: 'user',
      kind: 'text',
      content: trimmed,
      metadata: { source },
    });

    const entry = await this.ensureRuntime(session.id);
    entry.output = '';
    this.patchSession(session.id, { status: 'running', lastError: null });

    void entry.runtime.sendPrompt(trimmed).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.addMessage({
        sessionId,
        role: 'system',
        kind: 'error',
        content: message,
        metadata: { source: 'runtime' },
      });
      this.patchSession(sessionId, { status: 'error', lastError: message, currentTurnId: null });
      this.events.publish({ type: 'runtime.error', sessionId, payload: { error: message } });
    });

    return userMessage;
  }

  async interrupt(sessionId: string): Promise<void> {
    this.getSession(sessionId);
    const entry = this.runtimes.get(sessionId);
    await entry?.runtime.interrupt();
    this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
  }

  async resolveApproval(approvalId: string, decision: string, source: ControlType): Promise<void> {
    await this.permissions.resolveApproval(approvalId, decision, source);
  }

  async shutdown(): Promise<void> {
    this.permissions.shutdown();
    await Promise.all([...this.runtimes.values()].map((entry) => entry.runtime.stop().catch(() => {})));
    this.runtimes.clear();
  }

  private async ensureRuntime(sessionId: string): Promise<RuntimeEntry> {
    const existing = this.runtimes.get(sessionId);
    if (existing) return existing;

    const session = this.getSession(sessionId);
    const entry: RuntimeEntry = {
      output: '',
      runtime: new CodexRuntime({
        bin: this.config.agents.codex.bin,
        session,
        onEvent: (event) => this.handleCodexEvent(sessionId, event),
        onThread: (threadId) => {
          this.patchSession(sessionId, { codexThreadId: threadId });
        },
        onTurn: (turnId) => {
          this.patchSession(sessionId, { currentTurnId: turnId, status: turnId ? 'running' : 'idle' });
        },
        onApproval: (toolName, input) => {
          this.patchSession(sessionId, { status: 'waiting_approval' });
          return this.permissions.requestApproval(sessionId, toolName, input);
        },
        onChoice: (input) => {
          this.patchSession(sessionId, { status: 'waiting_approval' });
          return this.permissions.requestChoice(sessionId, input);
        },
      }),
    };
    this.runtimes.set(sessionId, entry);
    await entry.runtime.start();
    return entry;
  }

  private handleCodexEvent(sessionId: string, event: CodexEvent): void {
    const entry = this.runtimes.get(sessionId);
    this.events.publish({ type: 'runtime.event', sessionId, payload: { event } });

    if (event.type === 'agent_message_delta') {
      const delta = String(event.delta ?? '');
      if (entry) entry.output += delta;
      this.events.publish({ type: 'message.delta', sessionId, payload: { delta } });
      return;
    }

    if (event.type === 'agent_message') {
      const text = String(event.message ?? '');
      if (entry && text && !entry.output.includes(text)) entry.output += text;
      return;
    }

    if (event.type === 'exec_command_begin') {
      const command = truncate(String(event.command ?? ''), 500);
      this.addMessage({
        sessionId,
        role: 'tool',
        kind: 'event',
        content: `[command]\n${command}`,
        metadata: { event },
      });
      return;
    }

    if (event.type === 'patch_apply_begin') {
      this.addMessage({
        sessionId,
        role: 'tool',
        kind: 'event',
        content: '[file change requested]',
        metadata: { event },
      });
      return;
    }

    if (event.type === 'task_complete') {
      const content = entry?.output.trim() || 'Done.';
      this.addMessage({
        sessionId,
        role: 'assistant',
        kind: 'text',
        content,
        metadata: {},
      });
      if (entry) entry.output = '';
      this.patchSession(sessionId, { status: 'idle', currentTurnId: null, lastError: null });
      return;
    }

    if (event.type === 'task_failed') {
      const error = String(event.error ?? 'unknown error');
      this.addMessage({
        sessionId,
        role: 'assistant',
        kind: 'error',
        content: error,
        metadata: { event },
      });
      if (entry) entry.output = '';
      this.patchSession(sessionId, { status: 'error', currentTurnId: null, lastError: error });
      return;
    }

    if (event.type === 'turn_aborted') {
      this.addMessage({
        sessionId,
        role: 'assistant',
        kind: 'event',
        content: 'Codex stopped.',
        metadata: { event },
      });
      if (entry) entry.output = '';
      this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
    }
  }

  private addMessage(input: Omit<Message, 'id' | 'createdAt'>): Message {
    const message = this.store.createMessage({
      ...input,
      id: randomUUID(),
      createdAt: Date.now(),
    });
    this.events.publish({ type: 'message.created', sessionId: message.sessionId, payload: { message } });
    const session = this.store.getSession(message.sessionId);
    if (session) this.patchSession(message.sessionId, { updatedAt: Date.now() });
    return message;
  }

  private patchSession(sessionId: string, patch: Partial<Session>): Session {
    const current = this.getSession(sessionId);
    const session = this.store.updateSession({
      ...current,
      ...patch,
      updatedAt: Date.now(),
    });
    this.events.publish({ type: 'session.updated', sessionId, payload: { session } });
    return session;
  }
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
