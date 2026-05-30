import { existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/config.js';
import { resolveWorkspacePath } from '../config/config.js';
import type { Approval, CodexEvent, ControlBinding, ControlType, Message, Session } from '../domain/types.js';
import type { ApprovalQuery, MessageQuery, Store } from '../store/store.js';
import { truncate } from '../utils.js';
import { logger } from '../logger.js';
import { CodexRuntime } from '../agents/codex/runtime.js';
import { EventBus } from './event-bus.js';
import { PermissionService } from './permissions.js';

type RuntimeEntry = {
  runtime: CodexRuntime;
  output: string;
};

type ControlLeaseInput = {
  controlType: ControlType;
  ownerId: string;
  label?: string;
  ttlMs?: number;
};

type ControlSourceInput = {
  ownerId?: string;
  label?: string;
};

type QueuedPrompt = {
  sessionId: string;
  text: string;
  source: ControlType;
};

const DEFAULT_CONTROL_TTL_MS = 10 * 60 * 1000;

export class ControlHub {
  private readonly runtimes = new Map<string, RuntimeEntry>();
  private readonly promptQueues = new Map<string, QueuedPrompt[]>();
  private readonly pumpingSessions = new Set<string>();

  constructor(
    readonly config: AppConfig,
    readonly store: Store,
    readonly events: EventBus,
    readonly permissions: PermissionService,
  ) {}

  stats(): { sessions: number; messages: number; pendingApprovals: number; runtimes: number; queuedPrompts: number } {
    return {
      ...this.store.stats(),
      runtimes: this.runtimes.size,
      queuedPrompts: [...this.promptQueues.values()].reduce((total, queue) => total + queue.length, 0),
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
      controlOwner: null,
      controlOwnerId: null,
      controlLabel: null,
      controlLeaseExpiresAt: null,
      controlUpdatedAt: null,
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

  listMessages(sessionId: string, query: number | MessageQuery = 200): Message[] {
    this.getSession(sessionId);
    return this.store.listMessages(sessionId, query);
  }

  listApprovals(query: ApprovalQuery = {}): Approval[] {
    if (query.sessionId) this.getSession(query.sessionId);
    return this.store.listApprovals(query);
  }

  renameSession(sessionId: string, title: string): Session {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Session title is required');
    const session = this.store.updateSessionTitle(sessionId, trimmed);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    this.events.publish({ type: 'session.updated', sessionId, payload: { session } });
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    const entry = this.runtimes.get(sessionId);
    if (entry) {
      await entry.runtime.stop();
      this.runtimes.delete(sessionId);
    }
    this.promptQueues.delete(sessionId);
    this.pumpingSessions.delete(sessionId);
    this.store.deleteSession(sessionId);
    this.events.publish({ type: 'session.deleted', sessionId, payload: { session } });
  }

  claimControl(sessionId: string, input: ControlLeaseInput): Session {
    const current = this.getSession(sessionId);
    if (current.controlOwnerId && !isExpiredControl(current) && current.controlOwnerId !== input.ownerId) {
      throw new Error(`Session is controlled by ${current.controlLabel ?? current.controlOwnerId}`);
    }
    const now = Date.now();
    const session = this.store.updateSessionControl(sessionId, {
      controlOwner: input.controlType,
      controlOwnerId: input.ownerId,
      controlLabel: input.label?.trim() || input.ownerId,
      controlLeaseExpiresAt: now + (input.ttlMs ?? DEFAULT_CONTROL_TTL_MS),
      controlUpdatedAt: now,
    });
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    this.events.publish({ type: 'session.control.updated', sessionId, payload: { session } });
    return session;
  }

  releaseControl(sessionId: string, ownerId?: string): Session {
    const session = this.getSession(sessionId);
    if (ownerId && session.controlOwnerId && session.controlOwnerId !== ownerId) {
      throw new Error(`Session is controlled by ${session.controlLabel ?? session.controlOwnerId}`);
    }
    return this.clearControl(sessionId);
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

  async sendMessage(sessionId: string, text: string, source: ControlType, control: ControlSourceInput = {}): Promise<Message> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Message text is required');
    const session = this.getSession(sessionId);
    this.assertControl(session, source, control.ownerId);
    const queued = this.isBusy(session) || this.pumpingSessions.has(sessionId) || (this.promptQueues.get(sessionId)?.length ?? 0) > 0;

    const userMessage = this.addMessage({
      sessionId,
      role: 'user',
      kind: 'text',
      content: trimmed,
      metadata: { source, ownerId: control.ownerId, controlLabel: control.label, queued },
    });

    this.enqueuePrompt({
      sessionId,
      text: trimmed,
      source,
    });
    void this.pumpPromptQueue(sessionId);
    return userMessage;
  }

  private async startPrompt(sessionId: string, text: string, source: ControlType): Promise<void> {
    const entry = await this.ensureRuntime(sessionId);
    entry.output = '';
    this.patchSession(sessionId, { status: 'running', lastError: null });

    void entry.runtime.sendPrompt(text).catch((error) => {
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
  }

  async interrupt(sessionId: string): Promise<void> {
    this.getSession(sessionId);
    const entry = this.runtimes.get(sessionId);
    await entry?.runtime.interrupt();
    this.promptQueues.delete(sessionId);
    this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
  }

  async resolveApproval(approvalId: string, decision: string, source: ControlType): Promise<void> {
    await this.permissions.resolveApproval(approvalId, decision, source);
  }

  async shutdown(): Promise<void> {
    this.permissions.shutdown();
    await Promise.all([...this.runtimes.values()].map((entry) => entry.runtime.stop().catch(() => {})));
    this.runtimes.clear();
    this.promptQueues.clear();
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
      void this.pumpPromptQueue(sessionId);
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
      this.promptQueues.delete(sessionId);
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
      this.promptQueues.delete(sessionId);
      this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
    }
  }

  private enqueuePrompt(prompt: QueuedPrompt): void {
    const queue = this.promptQueues.get(prompt.sessionId) ?? [];
    queue.push(prompt);
    this.promptQueues.set(prompt.sessionId, queue);
    this.events.publish({ type: 'session.updated', sessionId: prompt.sessionId, payload: { queuedPrompts: queue.length } });
  }

  private async pumpPromptQueue(sessionId: string): Promise<void> {
    if (this.pumpingSessions.has(sessionId)) return;
    this.pumpingSessions.add(sessionId);
    try {
      const session = this.getSession(sessionId);
      if (this.isBusy(session)) return;
      const queue = this.promptQueues.get(sessionId);
      if (!queue) return;
      const next = queue.shift();
      if (!next) return;
      if (queue.length === 0) this.promptQueues.delete(sessionId);
      await this.startPrompt(sessionId, next.text, next.source);
    } finally {
      this.pumpingSessions.delete(sessionId);
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

  private assertControl(session: Session, source: ControlType, ownerId: string | undefined): void {
    if (!session.controlOwner || !session.controlOwnerId) return;
    if (isExpiredControl(session)) {
      this.clearControl(session.id);
      return;
    }
    if (session.controlOwner === source && session.controlOwnerId === ownerId) return;
    throw new Error(`Session is controlled by ${session.controlLabel ?? session.controlOwner}`);
  }

  private clearControl(sessionId: string): Session {
    const session = this.store.updateSessionControl(sessionId, {
      controlOwner: null,
      controlOwnerId: null,
      controlLabel: null,
      controlLeaseExpiresAt: null,
      controlUpdatedAt: Date.now(),
    });
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    this.events.publish({ type: 'session.control.updated', sessionId, payload: { session } });
    return session;
  }

  private isBusy(session: Session): boolean {
    return session.status === 'running' || session.status === 'waiting_approval';
  }
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

function isExpiredControl(session: Session): boolean {
  return Boolean(session.controlLeaseExpiresAt && session.controlLeaseExpiresAt <= Date.now());
}
