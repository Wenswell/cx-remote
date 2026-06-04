import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { logger } from '../../logger.js';

type JsonRpcRequest = {
  id: number;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  id?: number | string | null;
  result?: unknown;
  error?: { message?: string; code?: number; data?: unknown };
};

type JsonRpcNotification = {
  method: string;
  params?: unknown;
};

type RequestHandler = (params: unknown) => Promise<unknown> | unknown;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface CodexAppServerClientOptions {
  bin: string;
  search: boolean;
  onDisconnect?: () => void;
}

export class CodexAppServerClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private requestHandlers = new Map<string, RequestHandler>();
  private notificationHandler: ((method: string, params: unknown) => void) | null = null;

  constructor(private readonly options: CodexAppServerClientOptions) {}

  async connect(): Promise<void> {
    if (this.child) return;

    const args = [
      ...(this.options.search ? ['--search'] : []),
      'app-server',
    ];
    logger.info('codex app-server starting', {
      bin: this.options.bin,
      search: this.options.search,
    });
    this.child = spawn(this.options.bin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      shell: process.platform === 'win32',
    });

    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => {
      const text = String(chunk).trim();
      if (text) logger.warn('codex stderr', { text });
    });

    this.child.on('exit', (code, signal) => {
      const error = new Error(`codex app-server exited, code=${code ?? 'null'}, signal=${signal ?? 'null'}`);
      logger.warn('codex app-server exited', { code, signal });
      this.rejectAll(error);
      this.child = null;
      this.options.onDisconnect?.();
    });

    this.child.on('error', (error) => {
      logger.error('codex app-server process error', { error: error.message });
      this.rejectAll(error);
      this.child = null;
      this.options.onDisconnect?.();
    });

    const lines = createInterface({ input: this.child.stdout });
    lines.on('line', (line) => {
      void this.handleLine(line);
    });
    logger.info('codex app-server started');
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      clientInfo: {
        name: 'cx-remote',
        title: 'CX Remote',
        version: '0.1.2',
      },
      capabilities: { experimentalApi: true, requestAttestation: false },
    }, 30_000);
    this.notify('initialized');
    logger.info('codex app-server initialized');
  }

  onNotification(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler;
  }

  registerRequestHandler(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  async startThread(params: unknown): Promise<unknown> {
    return this.request('thread/start', params);
  }

  async resumeThread(params: unknown): Promise<unknown> {
    return this.request('thread/resume', params);
  }

  async startTurn(params: unknown, signal?: AbortSignal): Promise<unknown> {
    return this.request('turn/start', params, 14 * 24 * 60 * 60 * 1000, signal);
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    await this.request('turn/interrupt', { threadId, turnId }, 30_000);
  }

  async disconnect(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child) return;

    logger.info('codex app-server stopping');
    child.stdin.end();
    child.kill();
    this.rejectAll(new Error('codex app-server disconnected'));
  }

  private async request(method: string, params?: unknown, timeoutMs = 14 * 24 * 60 * 60 * 1000, signal?: AbortSignal): Promise<unknown> {
    await this.connect();
    if (!this.child) throw new Error('codex app-server is not running');
    if (signal?.aborted) throw new Error('request aborted');

    const id = this.nextId++;
    const payload: JsonRpcRequest = { id, method, params };
    logger.debug('codex rpc request', { id, method });

    return new Promise((resolveRequest, rejectRequest) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        this.pending.delete(id);
      };

      const onAbort = () => {
        cleanup();
        rejectRequest(new Error('request aborted'));
      };

      const timer = setTimeout(() => {
        cleanup();
        logger.warn('codex rpc timeout', { id, method, timeoutMs });
        rejectRequest(new Error(`${method} timed out`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => {
          cleanup();
          resolveRequest(value);
        },
        reject: (error) => {
          cleanup();
          rejectRequest(error);
        },
        timer,
      });

      signal?.addEventListener('abort', onAbort, { once: true });
      this.child!.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private notify(method: string, params?: unknown): void {
    if (!this.child) throw new Error('codex app-server is not running');
    this.child.stdin.write(`${JSON.stringify({ method, params } satisfies JsonRpcNotification)}\n`);
    logger.debug('codex rpc notification sent', { method });
  }

  private async handleLine(line: string): Promise<void> {
    if (!line.trim()) return;

    let message: JsonRpcResponse | JsonRpcRequest | JsonRpcNotification;
    try {
      message = JSON.parse(line) as JsonRpcResponse | JsonRpcRequest | JsonRpcNotification;
    } catch {
      logger.warn('codex non-json stdout line', { text: line.slice(0, 500) });
      return;
    }

    if ('id' in message && !('method' in message)) {
      const id = Number(message.id);
      const pending = this.pending.get(id);
      if (!pending) return;
      if (message.error) {
        logger.warn('codex rpc response error', { id, error: message.error.message });
        pending.reject(new Error(message.error.message ?? 'codex request failed'));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if ('method' in message && 'id' in message) {
      await this.handleRequest(message as JsonRpcRequest);
      return;
    }

    if ('method' in message) {
      this.notificationHandler?.(message.method, message.params);
    }
  }

  private async handleRequest(message: JsonRpcRequest): Promise<void> {
    const handler = this.requestHandlers.get(message.method);
    logger.info('codex rpc inbound request', { id: message.id, method: message.method });
    let response: JsonRpcResponse;
    try {
      const result = handler ? await handler(message.params) : { decision: 'cancel' };
      response = { id: message.id, result };
    } catch (error) {
      logger.error('codex rpc inbound request failed', {
        id: message.id,
        method: message.method,
        error: error instanceof Error ? error.message : String(error),
      });
      response = {
        id: message.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
    this.child?.stdin.write(`${JSON.stringify(response)}\n`);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
