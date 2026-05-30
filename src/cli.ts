import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { createInterface } from 'node:readline';
import { loadConfig } from './config/config.js';
import { runSetup } from './cli/setup.js';
import { runDoctor } from './cli/doctor.js';
import { runConfigCommand } from './cli/config.js';

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
      client = new ApiClient(config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host, config.server.port, config.server.accessToken);
    } catch {
      client = undefined;
    }
    await runDoctor(client);
    return;
  }

  const { config } = loadConfig();
  const client = new ApiClient(config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host, config.server.port, config.server.accessToken);

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
      if (!sessionId) throw new Error('Usage: cx-tg session <session-id> [--json]');
      const detail = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}`);
      printMaybeJson(detail, hasFlag(argv, '--json'), formatSessionDetail);
      return;
    }
    case 'messages': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-tg messages <session-id> [--limit <n>] [--json]');
      const limit = valueAfter(argv, '--limit');
      const messages = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}/messages${queryString({ limit })}`);
      printMaybeJson(messages, hasFlag(argv, '--json'), formatMessages);
      return;
    }
    case 'new': {
      const cwd = valueAfter(argv, '--cwd') ?? argv[1];
      if (!cwd) throw new Error('Usage: cx-tg new --cwd <path> [--title <title>]');
      const title = valueAfter(argv, '--title');
      console.log(JSON.stringify(await client.post('/api/sessions', { cwd, title }), null, 2));
      return;
    }
    case 'send': {
      const sessionId = argv[1];
      const text = argv.slice(2).join(' ');
      if (!sessionId || !text) throw new Error('Usage: cx-tg send <session-id> <text>');
      console.log(JSON.stringify(await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, { text }), null, 2));
      return;
    }
    case 'attach': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-tg attach <session-id>');
      await attachSession(client, sessionId);
      return;
    }
    case 'stop': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-tg stop <session-id>');
      console.log(JSON.stringify(await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/interrupt`, {}), null, 2));
      return;
    }
    case 'rename': {
      const sessionId = argv[1];
      const title = argv.slice(2).join(' ').trim();
      if (!sessionId || !title) throw new Error('Usage: cx-tg rename <session-id> <title>');
      console.log(JSON.stringify(await client.patch(`/api/sessions/${encodeURIComponent(sessionId)}`, { title }), null, 2));
      return;
    }
    case 'delete': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-tg delete <session-id>');
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
      if (!approvalId) throw new Error('Usage: cx-tg approve <approval-id> [approved|denied|approved_for_session]');
      console.log(JSON.stringify(await client.post(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, { decision }), null, 2));
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
        path,
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
    const path = `/api/events?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(this.token)}`;
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
          handleSseFrame(frame, onEvent, onError);
          index = buffer.indexOf('\n\n');
        }
      });
    });
    req.on('error', onError);
    req.end();
    return () => req.destroy();
  }
}

function valueAfter(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
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

function handleSseFrame(frame: string, onEvent: (event: Record<string, unknown>) => void, onError: (error: Error) => void): void {
  const data = frame.split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n');
  if (!data) return;
  try {
    onEvent(JSON.parse(data) as Record<string, unknown>);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

function printMaybeJson(value: unknown, json: boolean, formatter: (value: unknown) => string): void {
  console.log(json ? JSON.stringify(value, null, 2) : formatter(value));
}

async function attachSession(client: ApiClient, sessionId: string): Promise<void> {
  const ownerId = `cli:${hostname()}:${process.pid}`;
  const controlLabel = `CLI ${hostname()}:${process.pid}`;
  const ttlMs = 30_000;
  const claim = () => client.patch(`/api/sessions/${encodeURIComponent(sessionId)}/control`, {
    controlType: 'cli',
    ownerId,
    controlLabel,
    ttlMs,
  });

  await claim();
  const history = await client.get(`/api/sessions/${encodeURIComponent(sessionId)}/messages?limit=50`);
  console.log(formatMessages(history));
  console.log('Attached. Type .exit to release control.');

  let streamed = false;
  let closed = false;
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'cx-tg> ' });
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
  const heartbeat = setInterval(() => {
    void claim().catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
    });
  }, 15_000);

  try {
    rl.prompt();
    rl.on('line', (line) => {
      void (async () => {
        const text = line.trim();
        if (!text) {
          rl.prompt();
          return;
        }
        if (text === '.exit' || text === '/exit' || text === '/quit') {
          rl.close();
          return;
        }
        await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/messages`, { text, ownerId, controlLabel });
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
    clearInterval(heartbeat);
    stopStream();
    await client.delete(`/api/sessions/${encodeURIComponent(sessionId)}/control?ownerId=${encodeURIComponent(ownerId)}`).catch(() => {});
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
    stats?: { sessions?: number; messages?: number; pendingApprovals?: number; runtimes?: number };
  };
  return [
    `Hub: ${status.server?.host}:${status.server?.port}`,
    `Public URL: ${status.server?.publicUrl || '-'}`,
    `Sessions: ${status.stats?.sessions ?? 0}`,
    `Messages: ${status.stats?.messages ?? 0}`,
    `Pending approvals: ${status.stats?.pendingApprovals ?? 0}`,
    `Active runtimes: ${status.stats?.runtimes ?? 0}`,
    `Telegram: ${status.controls?.telegram?.enabled ? 'enabled' : 'disabled'}`,
    `Workspace roots: ${(status.workspaceRoots ?? []).join(', ')}`,
  ].join('\n');
}

function formatSessions(value: unknown): string {
  const sessions = value as Array<{ id: string; title: string; cwd: string; status: string }>;
  if (sessions.length === 0) return 'No sessions.';
  return sessions.map((session) => `${session.id}\t${session.status}\t${session.title}\t${session.cwd}`).join('\n');
}

function formatSessionDetail(value: unknown): string {
  const detail = value as {
    session: {
      id: string;
      title: string;
      cwd: string;
      status: string;
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
    `${detail.session.id}\t${detail.session.status}\t${detail.session.title}`,
    `cwd: ${detail.session.cwd}`,
    `thread: ${detail.session.codexThreadId ?? '-'}`,
    `turn: ${detail.session.currentTurnId ?? '-'}`,
    `control: ${detail.session.controlLabel ?? 'shared'}`,
    `lease: ${detail.session.controlLeaseExpiresAt ? new Date(detail.session.controlLeaseExpiresAt).toISOString() : '-'}`,
    `lastError: ${detail.session.lastError ?? '-'}`,
    `messages: ${detail.messages?.length ?? 0}`,
    `pendingApprovals: ${detail.approvals?.length ?? 0}`,
  ].join('\n');
}

function formatMessages(value: unknown): string {
  const messages = value as Array<{ role: string; kind: string; content: string; createdAt: number }>;
  if (messages.length === 0) return 'No messages.';
  return messages.map((message) => [
    `[${new Date(message.createdAt).toISOString()}] ${message.role}/${message.kind}`,
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
    'cx-tg commands',
    '',
    '  cx-tg hub                         Start Hub + Web + Telegram',
    '  cx-tg setup                       Configure settings',
    '  cx-tg config path                 Print settings path',
    '  cx-tg config show [--resolved]    Print settings',
    '  cx-tg config list                 List settings',
    '  cx-tg config get <key>            Print one setting',
    '  cx-tg config set <key> <value>     Update settings',
    '  cx-tg config validate             Validate settings',
    '  cx-tg status                      Show Hub status',
    '  cx-tg sessions [--json]           List sessions',
    '  cx-tg session <session-id>        Show session detail',
    '  cx-tg messages <session-id>       Show session messages',
    '  cx-tg new --cwd <path>            Create session',
    '  cx-tg send <session-id> <text>    Send message',
    '  cx-tg attach <session-id>         Attach CLI to a session',
    '  cx-tg stop <session-id>           Interrupt session',
    '  cx-tg rename <session-id> <title> Rename session',
    '  cx-tg delete <session-id>         Delete session',
    '  cx-tg approvals [--all]           List approvals',
    '  cx-tg approve <approval-id>       Resolve approval',
    '  cx-tg doctor                      Check local Hub',
    '',
    'Settings: ~/.cx-tg/settings.json',
  ].join('\n'));
}
