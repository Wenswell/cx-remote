import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Hono } from 'hono';
import type { AppConfig } from '../src/config/config.js';
import type { PromptJob, Session } from '../src/domain/types.js';
import { HubServer } from '../src/hub/server.js';
import { EventBus } from '../src/runtime/event-bus.js';
import { ControlHub } from '../src/runtime/control-hub.js';
import { PermissionService } from '../src/runtime/permissions.js';
import { Store } from '../src/store/store.js';

export type TestHub = {
  dbPath: string;
  webDistDir: string;
  store: Store;
  config: AppConfig;
  events: EventBus;
  permissions: PermissionService;
  hub: ControlHub;
};

export type TestApp = TestHub & {
  app: Hono;
};

type TestAppOptions = {
  codexHome?: string;
};

export function createTestHub(): TestHub {
  const dbPath = tempDbPath();
  const webDistDir = tempWebDistDir();
  const store = new Store(dbPath);
  const config = createConfig(dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);
  const hub = new ControlHub(config, store, events, permissions);
  return { dbPath, webDistDir, store, config, events, permissions, hub };
}

export function createTestApp(options: TestAppOptions = {}): TestApp {
  const context = createTestHub();
  return { ...context, app: new HubServer(context.hub, context.config, { webDistDir: context.webDistDir, codexHome: options.codexHome }).createApp() };
}

export async function closeTestHub(context: TestHub): Promise<void> {
  await context.hub.shutdown();
  context.store.close();
  cleanupDb(context.dbPath);
  cleanupDir(context.webDistDir);
}

export function withStore(fn: (store: Store) => void): void {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  try {
    fn(store);
  } finally {
    store.close();
    cleanupDb(dbPath);
  }
}

export function createSession(
  store: Store,
  id = 'session-1',
  status: Session['status'] = 'idle',
  codexThreadId: string | null = null,
): Session {
  const now = Date.now();
  return store.createSession({
    id,
    title: 'Test session',
    cwd: process.cwd(),
    agent: 'codex',
    status,
    codexThreadId,
    currentTurnId: null,
    controlOwner: null,
    controlOwnerId: null,
    controlLabel: null,
    controlLeaseExpiresAt: null,
    controlUpdatedAt: null,
    config: {
      permissionMode: 'default',
      search: true,
    },
    createdAt: now,
    updatedAt: now,
    lastError: null,
  });
}

export function createConfig(dbPath: string): AppConfig {
  const home = dirname(dbPath);
  return {
    home,
    settingsPath: join(home, 'settings.json'),
    server: {
      host: '127.0.0.1',
      port: 3030,
      publicUrl: '',
      accessToken: 'test-access-token',
    },
    workspace: {
      roots: [process.cwd()],
    },
    agents: {
      default: 'codex',
      codex: {
        bin: 'codex',
        model: 'auto',
        reasoningEffort: 'default',
        permissionMode: 'default',
        search: true,
      },
    },
    controls: {
      web: { enabled: true },
      cli: { enabled: true },
      telegram: {
        enabled: false,
        botToken: '',
        allowedUsers: [],
        allowedChats: [],
        requireMention: false,
      },
    },
    approvals: {
      autoApproveCommands: [],
      autoApproveReadonly: false,
      timeoutMs: 10_000,
    },
    storage: {
      dbPath,
    },
    log: {
      level: 'error',
      file: 'logs/test.log',
      console: false,
      prompts: false,
    },
  };
}

export function createPromptJob(
  store: Store,
  sessionId: string,
  id: string,
  text: string,
  createdAt: number,
  status: PromptJob['status'] = 'queued',
): PromptJob {
  return store.createPromptJob({
    id,
    sessionId,
    text,
    source: 'cli',
    ownerId: null,
    controlLabel: null,
    status,
    error: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: status === 'running' ? createdAt : null,
    finishedAt: null,
  });
}

export async function readInitialSse(response: Response, abort: AbortController): Promise<string> {
  assert.ok(response.body);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.includes('"type":"ready"')) break;
    }
  } finally {
    abort.abort();
    await reader.cancel().catch(() => {});
  }
  return text;
}

export async function json<T>(response: Response): Promise<T> {
  assert.ok(response.ok);
  return await response.json() as T;
}

export function authHeaders(config: AppConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.server.accessToken}` };
}

export function jsonHeaders(config: AppConfig): Record<string, string> {
  return { ...authHeaders(config), 'Content-Type': 'application/json' };
}

export function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'cx-tg-test-')), 'cx-tg.db');
}

export function cleanupDb(dbPath: string): void {
  cleanupDir(dirname(dbPath));
}

function tempWebDistDir(): string {
  const webDistDir = mkdtempSync(join(tmpdir(), 'cx-tg-web-'));
  mkdirSync(join(webDistDir, 'assets'), { recursive: true });
  writeFileSync(join(webDistDir, 'index.html'), [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>CX TG</title>',
    '  <link rel="stylesheet" href="/assets/main.css">',
    '  <script type="module" src="/assets/main.js"></script>',
    '</head>',
    '<body><div id="app">CX TG</div></body>',
    '</html>',
    '',
  ].join('\n'));
  writeFileSync(join(webDistDir, 'assets/main.css'), '.shell { height: 100vh; }\n');
  writeFileSync(join(webDistDir, 'assets/main.js'), 'new EventSource("/api/events", { withCredentials: true });\n');
  return webDistDir;
}

function cleanupDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
