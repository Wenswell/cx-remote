import type { ApprovalResult, ChoiceResult, CodexEvent, SandboxMode, Session } from '../../domain/types.js';
import { asRecord, asString } from '../../utils.js';
import { logger } from '../../logger.js';
import { CodexAppServerClient } from './app-server-client.js';
import { CodexEventConverter } from './event-converter.js';

export interface CodexRuntimeOptions {
  bin: string;
  session: Session;
  onEvent: (event: CodexEvent) => void;
  onThread: (threadId: string) => void;
  onTurn: (turnId: string | null) => void;
  onApproval: (toolName: string, input: unknown) => Promise<ApprovalResult>;
  onChoice: (input: unknown) => Promise<ChoiceResult>;
}

export class CodexRuntime {
  private readonly client: CodexAppServerClient;
  private readonly converter = new CodexEventConverter();
  private turnDone: { promise: Promise<void>; resolve: () => void } | null = null;
  private ready = false;
  private running = false;
  private threadLoaded = false;
  private threadId: string | null;
  private turnId: string | null;

  constructor(private readonly options: CodexRuntimeOptions) {
    this.threadId = options.session.codexThreadId;
    this.turnId = options.session.currentTurnId;
    this.client = new CodexAppServerClient({
      bin: options.bin,
      search: options.session.config.search,
      onDisconnect: () => this.handleDisconnect(),
    });
  }

  get status(): { ready: boolean; running: boolean; threadId: string | null; turnId: string | null } {
    return {
      ready: this.ready,
      running: this.running,
      threadId: this.threadId,
      turnId: this.turnId,
    };
  }

  async start(): Promise<void> {
    if (this.ready) return;
    this.client.onNotification((method, params) => {
      for (const event of this.converter.convert(method, params)) {
        this.handleEvent(event);
      }
    });

    this.client.registerRequestHandler('item/commandExecution/requestApproval', async (params) => {
      const record = asRecord(params) ?? {};
      return mapApproval(await this.options.onApproval('CodexBash', {
        message: record.reason,
        command: record.command,
        cwd: record.cwd,
      }));
    });

    this.client.registerRequestHandler('item/fileChange/requestApproval', async (params) => {
      const record = asRecord(params) ?? {};
      return mapApproval(await this.options.onApproval('CodexPatch', {
        message: record.reason,
        grantRoot: record.grantRoot,
      }));
    });

    this.client.registerRequestHandler('item/tool/requestUserInput', async (params) => {
      return this.options.onChoice(params);
    });

    await this.client.connect();
    await this.client.initialize();
    this.ready = true;
    logger.info('codex runtime ready', { sessionKey: this.options.session.id, cwd: this.options.session.cwd });
  }

  async stop(): Promise<void> {
    await this.client.disconnect();
    this.ready = false;
    this.running = false;
    this.threadLoaded = false;
    logger.info('codex runtime stopped', { sessionKey: this.options.session.id });
  }

  async interrupt(): Promise<void> {
    if (this.threadId && this.turnId) {
      await this.client.interruptTurn(this.threadId, this.turnId);
    }
  }

  async sendPrompt(prompt: string, signal?: AbortSignal): Promise<void> {
    if (this.running) throw new Error('Codex is already running in this session');
    this.running = true;
    logger.info('codex prompt start', {
      sessionKey: this.options.session.id,
      cwd: this.options.session.cwd,
      threadId: this.threadId,
      promptLength: prompt.length,
    });

    try {
      await this.start();
      if (!this.threadId) {
        const response = await this.client.startThread({
          ...this.threadParams(),
        });
        this.threadId = extractThreadId(response) ?? this.threadId;
        if (this.threadId) this.options.onThread(this.threadId);
        this.threadLoaded = true;
      } else if (!this.threadLoaded) {
        const response = await this.client.resumeThread({
          threadId: this.threadId,
          ...this.threadParams(),
        });
        this.threadId = extractThreadId(response) ?? this.threadId;
        if (this.threadId) this.options.onThread(this.threadId);
        this.threadLoaded = true;
      }

      if (!this.threadId) throw new Error('Codex did not return a thread id');

      const turnDone = createTurnDone();
      this.turnDone = turnDone;
      const response = await this.client.startTurn({
        threadId: this.threadId,
        cwd: this.options.session.cwd,
        input: [{ type: 'text', text: prompt }],
        approvalPolicy: this.options.session.config.approvalPolicy,
        permissions: permissionProfile(this.options.session.config.sandbox),
        model: emptyToUndefined(this.options.session.config.model),
        effort: emptyToUndefined(this.options.session.config.reasoningEffort),
      }, signal);
      this.turnId = extractTurnId(response) ?? this.turnId;
      this.options.onTurn(this.turnId);
      await turnDone.promise;
    } finally {
      this.turnDone?.resolve();
      this.turnDone = null;
      this.running = false;
      this.options.onTurn(null);
      logger.info('codex prompt finished', { sessionKey: this.options.session.id, threadId: this.threadId });
    }
  }

  private handleEvent(event: CodexEvent): void {
    if (event.type === 'thread_started') {
      this.threadId = asString(event.thread_id) ?? this.threadId;
      this.threadLoaded = true;
      if (this.threadId) this.options.onThread(this.threadId);
    }
    if (event.type === 'task_started') {
      this.turnId = asString(event.turn_id) ?? this.turnId;
      this.options.onTurn(this.turnId);
    }
    if (event.type === 'task_complete' || event.type === 'task_failed' || event.type === 'turn_aborted') {
      this.turnId = null;
      this.options.onTurn(null);
      this.turnDone?.resolve();
      this.turnDone = null;
    }
    this.options.onEvent(event);
  }

  private handleDisconnect(): void {
    this.ready = false;
    this.running = false;
    this.threadLoaded = false;
    this.turnDone?.resolve();
    this.turnDone = null;
  }

  private threadParams(): Record<string, unknown> {
    return {
      cwd: this.options.session.cwd,
      approvalPolicy: this.options.session.config.approvalPolicy,
      permissions: permissionProfile(this.options.session.config.sandbox),
      model: emptyToUndefined(this.options.session.config.model),
      config: {
        ...(this.options.session.config.reasoningEffort ? { model_reasoning_effort: this.options.session.config.reasoningEffort } : {}),
      },
    };
  }
}

function mapApproval(result: ApprovalResult): { decision: string; reason?: string } {
  switch (result.decision) {
    case 'approved':
      return { decision: 'accept' };
    case 'approved_for_session':
      return { decision: 'acceptForSession' };
    case 'denied':
      return { decision: 'decline', reason: result.reason };
    case 'abort':
      return { decision: 'cancel', reason: result.reason };
  }
}

function createTurnDone(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function extractThreadId(response: unknown): string | null {
  const record = asRecord(response) ?? {};
  const thread = asRecord(record.thread);
  return asString(thread?.id ?? thread?.threadId ?? thread?.thread_id ?? record.threadId ?? record.thread_id) ?? null;
}

function extractTurnId(response: unknown): string | null {
  const record = asRecord(response) ?? {};
  const turn = asRecord(record.turn);
  return asString(turn?.id ?? turn?.turnId ?? turn?.turn_id ?? record.turnId ?? record.turn_id) ?? null;
}

function permissionProfile(sandbox: SandboxMode): string {
  switch (sandbox) {
    case 'read-only':
      return ':read-only';
    case 'danger-full-access':
      return ':danger-full-access';
    case 'workspace-write':
      return ':workspace';
  }
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
