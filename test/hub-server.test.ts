import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import type { AppConfig } from '../src/config/config.js';
import type { Session } from '../src/domain/types.js';
import { HubServer } from '../src/hub/server.js';
import { EventBus } from '../src/runtime/event-bus.js';
import { ControlHub } from '../src/runtime/control-hub.js';
import { PermissionService } from '../src/runtime/permissions.js';
import { Store } from '../src/store/store.js';
import { configureLogger } from '../src/logger.js';

configureLogger({ level: 'error', console: false, prompts: false });

test('events endpoint replays stored events after a cursor', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const config = createConfig(dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);
  const hub = new ControlHub(config, store, events, permissions);
  const app = new HubServer(hub, config).createApp();
  const abort = new AbortController();

  try {
    const session = createSession(store);
    const first = store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'first' }, createdAt: 10 });
    const second = store.addEvent({ type: 'message.created', sessionId: session.id, payload: { marker: 'second' }, createdAt: 20 });

    const response = await app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(config.server.accessToken)}&afterId=${first.id}`,
      { signal: abort.signal },
    );
    const text = await readInitialSse(response, abort);

    assert.equal(response.status, 200);
    assert.match(text, new RegExp(`id: ${second.id}`));
    assert.match(text, /"marker":"second"/);
    assert.doesNotMatch(text, /"marker":"first"/);
    assert.doesNotMatch(text, /payload_json/);
    assert.match(text, /"type":"ready"/);
  } finally {
    abort.abort();
    await hub.shutdown();
    store.close();
    cleanupDb(dbPath);
  }
});

test('session queue API lists active prompt jobs', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const config = createConfig(dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);
  const hub = new ControlHub(config, store, events, permissions);
  const app = new HubServer(hub, config).createApp();

  try {
    const session = createSession(store, 'session-1', 'running');
    const send = await app.request(`/api/sessions/${encodeURIComponent(session.id)}/messages`, {
      method: 'POST',
      headers: jsonHeaders(config),
      body: JSON.stringify({ text: 'queued from api', controlType: 'cli' }),
    });
    assert.equal(send.status, 202);

    const queue = await json<Array<{ text: string; status: string }>>(await app.request(
      `/api/sessions/${encodeURIComponent(session.id)}/queue`,
      { headers: authHeaders(config) },
    ));
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.text, 'queued from api');
    assert.equal(queue[0]?.status, 'queued');

    const detail = await json<{
      session: Record<string, unknown>;
      messages: Array<Record<string, unknown>>;
      queue: Array<{ text: string }>;
    }>(await app.request(
      `/api/sessions/${encodeURIComponent(session.id)}`,
      { headers: authHeaders(config) },
    ));
    assert.equal(detail.queue[0]?.text, 'queued from api');
    assert.equal('config_json' in detail.session, false);
    assert.equal('metadata_json' in detail.messages[0]!, false);
  } finally {
    await hub.shutdown();
    store.close();
    cleanupDb(dbPath);
  }
});

async function readInitialSse(response: Response, abort: AbortController): Promise<string> {
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

async function json<T>(response: Response): Promise<T> {
  assert.ok(response.ok);
  return await response.json() as T;
}

function authHeaders(config: AppConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.server.accessToken}` };
}

function jsonHeaders(config: AppConfig): Record<string, string> {
  return { ...authHeaders(config), 'Content-Type': 'application/json' };
}

function createSession(store: Store, id = 'session-1', status: Session['status'] = 'idle'): Session {
  const now = Date.now();
  return store.createSession({
    id,
    title: 'Test session',
    cwd: process.cwd(),
    agent: 'codex',
    status,
    codexThreadId: null,
    currentTurnId: null,
    controlOwner: null,
    controlOwnerId: null,
    controlLabel: null,
    controlLeaseExpiresAt: null,
    controlUpdatedAt: null,
    config: {
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
      search: false,
      bypassApprovalsAndSandbox: false,
    },
    createdAt: now,
    updatedAt: now,
    lastError: null,
  });
}

function createConfig(dbPath: string): AppConfig {
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
        model: '',
        reasoningEffort: '',
        approvalPolicy: 'on-request',
        sandbox: 'workspace-write',
        search: false,
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

function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'cx-tg-test-')), 'cx-tg.db');
}

function cleanupDb(dbPath: string): void {
  rmSync(dirname(dbPath), { recursive: true, force: true });
}
