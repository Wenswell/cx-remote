import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { loadConfig } from './config/config.js';

type Method = 'GET' | 'POST';

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

  const { config } = loadConfig();
  const client = new ApiClient(config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host, config.server.port, config.server.accessToken);

  switch (command) {
    case 'status': {
      console.log(JSON.stringify(await client.get('/api/status'), null, 2));
      return;
    }
    case 'sessions': {
      const sessions = await client.get('/api/sessions') as Array<{ id: string; title: string; cwd: string; status: string }>;
      for (const session of sessions) {
        console.log(`${session.id}\t${session.status}\t${session.title}\t${session.cwd}`);
      }
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
    case 'stop': {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('Usage: cx-tg stop <session-id>');
      console.log(JSON.stringify(await client.post(`/api/sessions/${encodeURIComponent(sessionId)}/interrupt`, {}), null, 2));
      return;
    }
    case 'approve': {
      const approvalId = argv[1];
      const decision = argv[2] ?? 'approved';
      if (!approvalId) throw new Error('Usage: cx-tg approve <approval-id> [approved|denied|approved_for_session]');
      console.log(JSON.stringify(await client.post(`/api/approvals/${encodeURIComponent(approvalId)}/resolve`, { decision }), null, 2));
      return;
    }
    case 'doctor': {
      await doctor(client);
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
            reject(new Error(data || `HTTP ${res.statusCode}`));
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
}

function valueAfter(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function doctor(client: ApiClient): Promise<void> {
  try {
    const status = await client.get('/api/status');
    console.log('hub: ok');
    console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.log('hub: failed');
    console.log(error instanceof Error ? error.message : String(error));
  }
}

function printHelp(): void {
  console.log([
    'cx-tg commands',
    '',
    '  cx-tg hub                         Start Hub + Web + Telegram',
    '  cx-tg status                      Show Hub status',
    '  cx-tg sessions                    List sessions',
    '  cx-tg new --cwd <path>            Create session',
    '  cx-tg send <session-id> <text>    Send message',
    '  cx-tg stop <session-id>           Interrupt session',
    '  cx-tg approve <approval-id>       Resolve approval',
    '  cx-tg doctor                      Check local Hub',
    '',
    'Settings: ~/.cx-tg/settings.json',
  ].join('\n'));
}
