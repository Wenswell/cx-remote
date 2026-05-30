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
    assert.match(text, /"type":"ready"/);
  } finally {
    abort.abort();
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

function createSession(store: Store, id = 'session-1'): Session {
  const now = Date.now();
  return store.createSession({
    id,
    title: 'Test session',
    cwd: process.cwd(),
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
