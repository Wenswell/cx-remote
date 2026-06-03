import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { createInterface } from 'node:readline';
import { loadConfig, serverBasePath } from './config/config.js';
import { runSetup } from './cli/setup.js';
import { runDoctor } from './cli/doctor.js';
import { runConfigCommand } from './cli/config.js';
import { decodeSseFrame } from './runtime/sse.js';
import { CLI_CONTROL_TTL_MS, cliControlIdentity } from './controls/control-actions.js';
import type { CodexSessionConfigPatch } from './domain/types.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0] || 'help';
  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'version' || command === '--version') {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    console.log(pkg.version);
    return;
  }

  if (command === 'hub') {
    const { startApp } = await import('./main.js');
    await startApp();
    return;
  }

  if (command === 'setup') {
    await runSetup();
    return;
  }

  if (command === 'config') {
    runConfigCommand(argv.slice(1));
    return;
  }

  if (command === 'doctor') {
    let client: ApiClient | undefined;
    try {
      const { config } = loadConfig();
      client = new ApiClient(config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host, config.server.port, config.server.accessToken, serverBasePath(config.server.publicUrl));
    } catch {
      client = undefined;
    }
    await runDoctor(client);
    return;
  }

  const { config } = loadConfig();
  const client = new ApiClient(config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host, config.server.port, config.server.accessToken, serverBasePath(config.server.publicUrl));

  switch (command) {
    case 'status': {
      const status = await client.get('/api/status');
      printMaybeJson(status, hasFlag(argv, '--json'), formatStatus);
      return;
    }
    case 'sessions': {
      const sessions = await client.get('/api/sessions');
      printMaybeJson(sessions, hasFlag(argv, '--json'), formatSessions);
      return;
    }
    case 'session': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-remote session <session-id> [--json]');
      const detail = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}`);
      printMaybeJson(detail, hasFlag(argv, '--json'), formatSessionDetail);
      return;
    }
    case 'messages': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-remote messages <session-id> [--limit <n>] [--json]');
      const limit = valueAfter(argv, '--limit');
      const messages = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}/messages${queryString({ limit })}`);
      printMaybeJson(messages, hasFlag(argv, '--json'), formatMessages);
      return;
    }
    case 'new': {
      const cwd = valueAfter(argv, '--cwd') ?? argv[1];
      if (!cwd) throw new Error('Usage: cx-remote new --cwd <path> [--node <node-id>] [--title <title>] [runtime flags]');
      const title = valueAfter(argv, '--title');
      const nodeId = valueAfter(argv, '--node');
      console.log(JSON.stringify(await client.post('/api/sessions', { nodeId, cwd, title, config: sessionConfigFromArgs(argv) }), null, 2));
      return;
    }
    case 'adopt': {
      const threadId = valueAfter(argv, '--thread') ?? positionalValue(argv);
      const cwd = valueAfter(argv, '--cwd');
      if (!threadId || !cwd) throw new Error('Usage: cx-remote adopt --thread <codex-thread-id> --cwd <path> [--node <node-id>] [--title <title>] [--import] [runtime flags]');
      const title = valueAfter(argv, '--title');
      const nodeId = valueAfter(argv, '--node');
      console.log(JSON.stringify(await client.post('/api/sessions/adopt', {
        nodeId,
        threadId,
        cwd,
        title,
        importTranscript: hasFlag(argv, '--import'),
        config: sessionConfigFromArgs(argv),
      }), null, 2));
      return;
    }
    case 'send': {
      const sessionId = argv[1];
      const text = argv.slice(2).join(' ');
      if (!sessionId || !text) throw new Error('Usage: cx-remote send <session-id> <text>');
      console.log(JSON.stringify(await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, { text, controlType: 'cli' }), null, 2));
      return;
    }
    case 'attach': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-remote attach <session-id> [--claim]');
      await attachSession(client, sessionId, hasFlag(argv, '--claim'));
      return;
    }
    case 'stop': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-remote stop <session-id>');
      console.log(JSON.stringify(await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/interrupt`, {}), null, 2));
      return;
    }
    case 'rename': {
      const sessionId = argv[1];
      const title = argv.slice(2).join(' ').trim();
      if (!sessionId || !title) throw new Error('Usage: cx-remote rename <session-id> <title>');
      console.log(JSON.stringify(await client.patch(`/api/sessions/${encodeURIComponent(sessionId)}`, { title }), null, 2));
      return;
    }
    case 'session-config': {
      const sessionId = argv[1];
      const config = sessionConfigFromArgs(argv);
      if (!sessionId || !config) throw new Error('Usage: cx-remote session-config <session-id> [runtime flags]');
      console.log(JSON.stringify(await client.patch(`/api/sessions/${encodeURIComponent(sessionId)}/config`, { config }), null, 2));
      return;
    }
    case 'delete': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-remote delete <session-id>');
      console.log(JSON.stringify(await client.delete(`/api/sessions/${encodeURIComponent(sessionId)}`), null, 2));
      return;
    }
    case 'approvals': {
      const status = hasFlag(argv, '--all') ? 'all' : (valueAfter(argv, '--status') ?? 'pending');
      const sessionId = valueAfter(argv, '--session');
      const limit = valueAfter(argv, '--limit');
      const approvals = await client.get(`/api/approvals${queryString({ status, sessionId, limit })}`);
      printMaybeJson(approvals, hasFlag(argv, '--json'), formatApprovals);
      return;
    }
    case 'approve': {
      const approvalId = argv[1];
      const decision = argv[2] ?? 'approved';
      if (!approvalId) throw new Error('Usage: cx-remote approve <approval-id> [approved|denied|approved_for_session]');
      console.log(JSON.stringify(await client.post(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, { decision, controlType: 'cli' }), null, 2));
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

class ApiClient {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly token: string,
    private readonly basePath: string,
  ) {}

  get(path: string): Promise<unknown> {
    return this.call('GET', path);
  }

  post(path: string, body: unknown): Promise<unknown> {
    return this.call('POST', path, body);
  }

  patch(path: string, body: unknown): Promise<unknown> {
    return this.call('PATCH', path, body);
  }

  delete(path: string): Promise<unknown> {
    return this.call('DELETE', path);
  }

  private call(method: Method, path: string, body?: unknown): Promise<unknown> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = request({
        host: this.host,
        port: this.port,
        path: this.path(path),
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(parseErrorMessage(data) || `HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data) as unknown);
          } catch {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  streamEvents(sessionId: string, onEvent: (event: Record<string, unknown>) => void, onError: (error: Error) => void): () => void {
    const path = this.path(`/api/events?sessionId=${encodeURIComponent(sessionId)}`);
    let buffer = '';
    const req = request({
      host: this.host,
      port: this.port,
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    }, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        onError(new Error(`SSE HTTP ${res.statusCode}`));
        return;
      }
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let index = buffer.indexOf('\n\n');
        while (index >= 0) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          try {
            const event = decodeSseFrame(frame);
            if (event) onEvent(event);
          } catch (error) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
          index = buffer.indexOf('\n\n');
        }
      });
    });
    req.on('error', onError);
    req.end();
    return () => req.destroy();
  }

  private path(path: string): string {
    return `${this.basePath}${path}`;
  }
}

function valueAfter(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function positionalValue(argv: string[]): string | undefined {
  const value = argv[1];
  return value && !value.startsWith('--') ? value : undefined;
}

function sessionConfigFromArgs(argv: string[]): CodexSessionConfigPatch | undefined {
  const config: CodexSessionConfigPatch = {};
  const model = valueAfter(argv, '--model');
  const reasoningEffort = valueAfter(argv, '--reasoning-effort');
  const permissionMode = valueAfter(argv, '--permission-mode');

  if (model !== undefined) config.model = model;
  if (reasoningEffort !== undefined) config.reasoningEffort = reasoningEffort;
  if (permissionMode !== undefined) config.permissionMode = permissionMode as CodexSessionConfigPatch['permissionMode'];
  if (hasFlag(argv, '--search')) config.search = true;
  if (hasFlag(argv, '--no-search')) config.search = false;
  if (hasFlag(argv, '--dangerously-bypass-approvals-and-sandbox')) config.permissionMode = 'yolo';

  return Object.keys(config).length ? config : undefined;
}

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function parseErrorMessage(text: string): string {
  if (!text) return '';
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    return payload.error?.message || text;
  } catch {
    return text;
  }
}

function printMaybeJson(value: unknown, json: boolean, formatter: (value: unknown) => string): void {
  console.log(json ? JSON.stringify(value, null, 2) : formatter(value));
}

async function attachSession(client: ApiClient, sessionId: string, claimExclusive: boolean): Promise<void> {
  const control = cliControlIdentity(hostname(), process.pid);
  const claim = () => client.patch(`/api/sessions/${encodeURIComponent(sessionId)}/control`, {
    controlType: 'cli',
    ownerId: control.ownerId,
    controlLabel: control.label,
    ttlMs: CLI_CONTROL_TTL_MS,
  });

  if (claimExclusive) await claim();
  const history = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=50`);
  console.log(formatMessages(history));
  console.log(claimExclusive ? 'Attached with exclusive control. Type .exit to release control.' : 'Attached shared. Type .exit to leave.');

  let streamed = false;
  let closed = false;
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'cx-remote> ' });
  const prompt = () => {
    if (!closed) rl.prompt();
  };
  const stopStream = client.streamEvents(sessionId, (event) => {
    streamed = renderAttachEvent(event, streamed, prompt);
  }, (error) => {
    if (closed) return;
    console.error(error.message);
    prompt();
  });
  const heartbeat = claimExclusive
    ? setInterval(() => {
      void claim().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
      });
    }, 15_000)
    : undefined;

  try {
    rl.prompt();
    rl.on('line', (line) => {
      void (async () => {
        const text = line.trim();
        if (!text) {
          prompt();
          return;
        }
        if (text === '.exit' || text === '/exit' || text === '/quit') {
          rl.close();
          return;
        }
        await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, { text, controlType: 'cli', ownerId: control.ownerId, controlLabel: control.label });
        prompt();
      })().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        prompt();
      });
    });
    await new Promise<void>((resolve) => {
      rl.once('close', () => {
        closed = true;
        resolve();
      });
    });
  } finally {
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    stopStream();
    if (claimExclusive) await client.delete(`/api/sessions/${encodeURIComponent(sessionId)}/control?ownerId=${encodeURIComponent(control.ownerId)}`).catch(() => {});
  }
}

function renderAttachEvent(event: Record<string, unknown>, streamed: boolean, prompt: () => void): boolean {
  if (event.type === 'message.delta') {
    const payload = event.payload as { delta?: unknown } | undefined;
    process.stdout.write(String(payload?.delta ?? ''));
    return true;
  }
  if (event.type === 'message.created') {
    const payload = event.payload as { message?: { role: string; kind: string; content: string; createdAt: number } } | undefined;
    const message = payload?.message;
    if (!message || message.role === 'user') return streamed;
    if (message.role === 'assistant' && streamed) {
      process.stdout.write('\n');
      prompt();
      return false;
    }
    console.log('\n' + formatMessages([message]));
    prompt();
    return false;
  }
  if (event.type === 'approval.created') {
    const payload = event.payload as { approval?: { id: string; toolName: string } } | undefined;
    if (payload?.approval) {
      console.log(`\nApproval requested: ${payload.approval.toolName} ${payload.approval.id}`);
      prompt();
    }
  }
  if (event.type === 'session.control.updated') {
    const payload = event.payload as { session?: { controlLabel?: string | null } } | undefined;
    console.log(`\nControl: ${payload?.session?.controlLabel ?? 'shared'}`);
    prompt();
  }
  return streamed;
}

function formatStatus(value: unknown): string {
  const status = value as {
    server?: { host?: string; port?: number; publicUrl?: string };
    workspaceRoots?: string[];
    controls?: { telegram?: { enabled?: boolean } };
    stats?: { sessions?: number; messages?: number; pendingApprovals?: number; runtimes?: number; queuedPrompts?: number };
  };
  return [
    `Hub: ${status.server?.host}:${status.server?.port}`,
    `Public URL: ${status.server?.publicUrl || '-'}`,
    `Sessions: ${status.stats?.sessions ?? 0}`,
    `Messages: ${status.stats?.messages ?? 0}`,
    `Pending approvals: ${status.stats?.pendingApprovals ?? 0}`,
    `Active runtimes: ${status.stats?.runtimes ?? 0}`,
    `Queued prompts: ${status.stats?.queuedPrompts ?? 0}`,
    `Telegram: ${status.controls?.telegram?.enabled ? 'enabled' : 'disabled'}`,
    `Workspace roots: ${(status.workspaceRoots ?? []).join(', ')}`,
  ].join('\n');
}

function formatSessions(value: unknown): string {
  const sessions = value as Array<{ id: string; title: string; cwd: string; status: string; nodeName?: string }>;
  if (sessions.length === 0) return 'No Hub-managed sessions.';
  return sessions.map((session) => `${session.id}\t${session.nodeName ?? 'local'}\t${session.status}\t${session.title}\t${session.cwd}`).join('\n');
}

function formatSessionDetail(value: unknown): string {
  const detail = value as {
    session: {
      id: string;
      nodeName?: string;
      title: string;
      cwd: string;
      status: string;
      config?: {
        model?: string;
        reasoningEffort?: string;
        permissionMode?: string;
        search?: boolean;
      };
      codexThreadId: string | null;
      currentTurnId: string | null;
      controlLabel: string | null;
      controlLeaseExpiresAt: number | null;
      lastError: string | null;
    };
    messages?: unknown[];
    approvals?: unknown[];
  };
  return [
    `Hub session: ${detail.session.id}\t${detail.session.nodeName ?? 'local'}\t${detail.session.status}\t${detail.session.title}`,
    `cwd: ${detail.session.cwd}`,
    `runtime: ${formatSessionConfig(detail.session.config)}`,
    `Codex thread: ${detail.session.codexThreadId ?? '-'}`,
    `Codex turn: ${detail.session.currentTurnId ?? '-'}`,
    `control: ${detail.session.controlLabel ?? 'shared'}`,
    `lease: ${detail.session.controlLeaseExpiresAt ? new Date(detail.session.controlLeaseExpiresAt).toISOString() : '-'}`,
    `lastError: ${detail.session.lastError ?? '-'}`,
    `messages: ${detail.messages?.length ?? 0}`,
    `pendingApprovals: ${detail.approvals?.length ?? 0}`,
  ].join('\n');
}

function formatSessionConfig(config: { model?: string; reasoningEffort?: string; permissionMode?: string; search?: boolean } | undefined): string {
  if (!config) return '-';
  return [
    `model=${config.model || '-'}`,
    `effort=${config.reasoningEffort || '-'}`,
    `permission=${config.permissionMode || '-'}`,
    `search=${config.search ? 'on' : 'off'}`,
  ].join(' ');
}

function formatMessages(value: unknown): string {
  const messages = value as Array<{ role: string; kind: string; content: string; createdAt: number; metadata?: { queued?: boolean } }>;
  if (messages.length === 0) return 'No messages.';
  return messages.map((message) => [
    `[${new Date(message.createdAt).toISOString()}] ${message.role}/${message.kind}${message.metadata?.queued ? ' queued' : ''}`,
    message.content,
  ].join('\n')).join('\n\n');
}

function formatApprovals(value: unknown): string {
  const approvals = value as Array<{ id: string; sessionId: string; status: string; toolName: string; createdAt: number; decision: string | null }>;
  if (approvals.length === 0) return 'No approvals.';
  return approvals.map((approval) => [
    `${approval.id}\t${approval.status}\t${approval.toolName}`,
    `session: ${approval.sessionId}`,
    `decision: ${approval.decision ?? '-'}`,
    `created: ${new Date(approval.createdAt).toISOString()}`,
  ].join('\n')).join('\n\n');
}

function printHelp(): void {
  console.log([
    'cx-remote commands',
    '',
    '  cx-remote hub                         Start Hub + Web + Telegram',
    '  cx-remote setup                       Configure settings',
    '  cx-remote config path                 Print settings path',
    '  cx-remote config show [--resolved]    Print settings',
    '  cx-remote config list                 List settings',
    '  cx-remote config get <key>            Print one setting',
    '  cx-remote config set <key> <value>     Update settings',
    '  cx-remote config validate             Validate settings',
    '  cx-remote status                      Show Hub status',
    '  cx-remote sessions [--json]           List Hub-managed sessions',
    '  cx-remote session <session-id>        Show Hub session detail',
    '  cx-remote messages <session-id>       Show Hub session messages',
    '  cx-remote new --cwd <path> [--node <id>] Create Hub-managed session',
    '    [--model <model>] [--reasoning-effort <effort>] [--search|--no-search] [--permission-mode <mode>]',
    '    [--dangerously-bypass-approvals-and-sandbox]',
    '  cx-remote adopt --thread <id> --cwd <path> [--node <id>] Adopt Codex thread',
    '    [--import]',
    '    [--model <model>] [--reasoning-effort <effort>] [--search|--no-search] [--permission-mode <mode>]',
    '    [--dangerously-bypass-approvals-and-sandbox]',
    '  cx-remote send <session-id> <text>    Send message',
    '  cx-remote attach <session-id>         Attach shared CLI to a session',
    '  cx-remote attach <session-id> --claim Attach with exclusive control',
    '  cx-remote stop <session-id>           Stop session',
    '  cx-remote rename <session-id> <title> Rename session',
    '  cx-remote session-config <session-id> Update idle session runtime config',
    '  cx-remote delete <session-id>         Delete Hub session',
    '  cx-remote approvals [--all]           List approvals',
    '  cx-remote approve <approval-id>       Resolve approval',
    '  cx-remote doctor                      Check local Hub',
    '',
    'Settings: ~/.cx-remote/settings.json',
  ].join('\n'));
}
