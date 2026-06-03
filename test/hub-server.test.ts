import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureLogger } from '../src/logger.js';
import {
  authHeaders,
  closeTestHub,
  createSession,
  createTestApp,
  json,
  jsonHeaders,
  readInitialSse,
} from './helpers.js';

configureLogger({ level: 'error', console: false, prompts: false });

function appFetch(apps: Record<string, { request: (input: Request | string | URL, init?: RequestInit) => Response | Promise<Response> }>): typeof fetch {
  return (async (input: Request | string | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const app = apps[url.origin];
    if (!app) throw new Error(`No test app for origin: ${url.origin}`);
    return await Promise.resolve(app.request(new Request(request)));
  }) as typeof fetch;
}

test('events endpoint replays stored events after a cursor', async () => {
  const context = createTestApp();
  const abort = new AbortController();

  try {
    const session = createSession(context.store);
    const first = context.store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'first' }, createdAt: 10 });
    const second = context.store.addEvent({ type: 'message.created', sessionId: session.id, payload: { marker: 'second' }, createdAt: 20 });

    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&afterId=${first.id}`,
      { headers: authHeaders(context.config), signal: abort.signal },
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
    await closeTestHub(context);
  }
});

test('Last-Event-ID has priority over query afterId', async () => {
  const context = createTestApp();
  const abort = new AbortController();

  try {
    const session = createSession(context.store);
    const first = context.store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'first' }, createdAt: 10 });
    const second = context.store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'second' }, createdAt: 20 });

    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&afterId=0`,
      { headers: { ...authHeaders(context.config), 'Last-Event-ID': String(first.id) }, signal: abort.signal },
    );
    const text = await readInitialSse(response, abort);

    assert.equal(response.status, 200);
    assert.match(text, new RegExp(`id: ${second.id}`));
    assert.doesNotMatch(text, /"marker":"first"/);
  } finally {
    abort.abort();
    await closeTestHub(context);
  }
});

test('events endpoint rejects invalid cursor', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&afterId=bad`,
      { headers: authHeaders(context.config) },
    );

    assert.equal(response.status, 400);
  } finally {
    await closeTestHub(context);
  }
});

test('web auth cookie allows EventSource without query token', async () => {
  const context = createTestApp();
  const abort = new AbortController();

  try {
    const session = createSession(context.store);
    const login = await context.app.request('/api/auth', {
      method: 'POST',
      headers: authHeaders(context.config),
    });
    const cookie = login.headers.get('set-cookie') || '';
    assert.equal(login.status, 200);
    assert.match(cookie, /cx_tg_auth=/);
    assert.match(cookie, /HttpOnly/);

    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}`,
      { headers: { Cookie: cookie }, signal: abort.signal },
    );
    const text = await readInitialSse(response, abort);

    assert.equal(response.status, 200);
    assert.match(text, /"type":"ready"/);
  } finally {
    abort.abort();
    await closeTestHub(context);
  }
});

test('events endpoint rejects query token without auth cookie or bearer header', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(context.config.server.accessToken)}`,
    );

    assert.equal(response.status, 401);
  } finally {
    await closeTestHub(context);
  }
});

test('session queue API lists active prompt jobs', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store, 'session-1', 'running');
    const send = await context.app.request(`/api/sessions/${encodeURIComponent(session.id)}/messages`, {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ text: 'queued from api', controlType: 'cli' }),
    });
    assert.equal(send.status, 202);

    const queue = await json<Array<{ text: string; status: string }>>(await context.app.request(
      `/api/sessions/${encodeURIComponent(session.id)}/queue`,
      { headers: authHeaders(context.config) },
    ));
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.text, 'queued from api');
    assert.equal(queue[0]?.status, 'queued');

    const detail = await json<{
      session: Record<string, unknown>;
      messages: Array<Record<string, unknown>>;
      queue: Array<{ text: string }>;
    }>(await context.app.request(
      `/api/sessions/${encodeURIComponent(session.id)}`,
      { headers: authHeaders(context.config) },
    ));
    assert.equal(detail.queue[0]?.text, 'queued from api');
    assert.equal('config_json' in detail.session, false);
    assert.equal('metadata_json' in detail.messages[0]!, false);
  } finally {
    await closeTestHub(context);
  }
});

test('session adopt API creates a Hub-managed session for an existing Codex thread', async () => {
  const context = createTestApp();

  try {
    const response = await context.app.request('/api/sessions/adopt', {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ threadId: 'thread-1', cwd: process.cwd(), title: 'Adopted thread' }),
    });
    const session = await json<{ id: string; title: string; codexThreadId: string | null; currentTurnId: string | null }>(response);

    assert.equal(response.status, 201);
    assert.equal(session.title, 'Adopted thread');
    assert.equal(session.codexThreadId, 'thread-1');
    assert.equal(session.currentTurnId, null);

    const detail = await json<{ session: { codexThreadId: string | null } }>(await context.app.request(
      `/api/sessions/${encodeURIComponent(session.id)}`,
      { headers: authHeaders(context.config) },
    ));
    assert.equal(detail.session.codexThreadId, 'thread-1');
  } finally {
    await closeTestHub(context);
  }
});

test('sessions API filters Hub-managed sessions by workspace directory', async () => {
  const context = createTestApp();

  try {
    const rootSession = context.hub.createSession({ cwd: process.cwd(), title: 'Root session' });
    const srcSession = context.hub.createSession({ cwd: join(process.cwd(), 'src'), title: 'Src session' });

    const response = await context.app.request(
      `/api/sessions?cwd=${encodeURIComponent(join(process.cwd(), 'src'))}`,
      { headers: authHeaders(context.config) },
    );
    const body = await json<Array<{ id: string; title: string; cwd: string }>>(response);

    assert.equal(response.status, 200);
    assert.deepEqual(body.map((session) => session.id), [srcSession.id]);
    assert.equal(body[0]?.title, 'Src session');
    assert.equal(body[0]?.cwd, join(process.cwd(), 'src'));
    assert.notEqual(body[0]?.id, rootSession.id);
  } finally {
    await closeTestHub(context);
  }
});

test('aggregated workspaces and sessions include remote nodes', async () => {
  const remote = createTestApp({
    configure: (config) => {
      config.cluster.name = 'Remote node';
      config.server.accessToken = 'remote-access-token';
      config.workspace.roots = [process.cwd(), join(process.cwd(), 'src')];
    },
  });
  const remoteSession = remote.hub.createSession({ cwd: process.cwd(), title: 'Remote session' });
  const central = createTestApp({
    configure: (config) => {
      config.cluster.name = 'Central node';
      config.cluster.peers = [{
        id: 'remote1',
        name: 'Remote node',
        url: 'http://remote.test',
        accessToken: 'remote-access-token',
      }];
    },
    fetchImpl: appFetch({ 'http://remote.test': remote.app }),
  });
  const localSession = central.hub.createSession({ cwd: process.cwd(), title: 'Local session' });

  try {
    const workspaces = await json<Array<{ nodeId: string; nodeName: string; path: string }>>(await central.app.request(
      '/api/workspaces',
      { headers: authHeaders(central.config) },
    ));
    assert.equal(workspaces.some((workspace) => workspace.nodeId === 'local' && workspace.path === process.cwd()), true);
    assert.equal(workspaces.some((workspace) => workspace.nodeId === 'remote1' && workspace.path === process.cwd()), true);

    const sessions = await json<Array<{ id: string; localId: string; nodeId: string; nodeName: string; title: string }>>(await central.app.request(
      '/api/sessions',
      { headers: authHeaders(central.config) },
    ));
    assert.equal(sessions.some((session) => session.id === localSession.id && session.nodeId === 'local'), true);
    assert.equal(
      sessions.some((session) => session.id === `remote1::${remoteSession.id}` && session.localId === remoteSession.id && session.nodeName === 'Remote node'),
      true,
    );
  } finally {
    await closeTestHub(central);
    await closeTestHub(remote);
  }
});

test('session detail and create APIs proxy remote nodes', async () => {
  const remote = createTestApp({
    configure: (config) => {
      config.cluster.name = 'Remote node';
      config.server.publicUrl = 'https://remote.example/apps/cx-tg';
      config.server.accessToken = 'remote-access-token';
    },
  });
  const remoteSession = remote.hub.createSession({ cwd: process.cwd(), title: 'Remote session' });
  const central = createTestApp({
    configure: (config) => {
      config.cluster.peers = [{
        id: 'remote1',
        name: 'Remote node',
        url: 'http://remote.test/apps/cx-tg',
        accessToken: 'remote-access-token',
      }];
    },
    fetchImpl: appFetch({ 'http://remote.test': remote.app }),
  });

  try {
    const detail = await json<{
      session: { id: string; localId: string; nodeId: string; nodeName: string; title: string };
    }>(await central.app.request(
      `/api/sessions/${encodeURIComponent(`remote1::${remoteSession.id}`)}`,
      { headers: authHeaders(central.config) },
    ));
    assert.equal(detail.session.id, `remote1::${remoteSession.id}`);
    assert.equal(detail.session.localId, remoteSession.id);
    assert.equal(detail.session.nodeId, 'remote1');
    assert.equal(detail.session.nodeName, 'Remote node');

    const created = await json<{ id: string; nodeId: string; title: string }>(await central.app.request('/api/sessions', {
      method: 'POST',
      headers: jsonHeaders(central.config),
      body: JSON.stringify({ nodeId: 'remote1', cwd: process.cwd(), title: 'Created through proxy' }),
    }));
    assert.equal(created.nodeId, 'remote1');
    assert.equal(created.title, 'Created through proxy');
    assert.equal(remote.hub.listSessions().some((session) => session.title === 'Created through proxy'), true);
  } finally {
    await closeTestHub(central);
    await closeTestHub(remote);
  }
});

test('Codex sessions API lists resume sessions for a workspace directory', async () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const context = createTestApp({ codexHome });

  try {
    writeCodexSession(codexHome, 'thread-free', process.cwd(), 'Free thread', '2026-06-03T10:00:00.000Z');
    writeCodexSession(codexHome, 'thread-managed', process.cwd(), 'Managed thread', '2026-06-03T11:00:00.000Z');
    writeCodexSession(codexHome, 'thread-other', tmpdir(), 'Other thread', '2026-06-03T12:00:00.000Z');
    const managed = context.hub.adoptCodexThread({ threadId: 'thread-managed', cwd: process.cwd() });

    const response = await context.app.request(
      `/api/codex/sessions?cwd=${encodeURIComponent(process.cwd())}`,
      { headers: authHeaders(context.config) },
    );
    const body = await json<{
      cwd: string;
      sessions: Array<{ id: string; title: string; managedSessionId: string | null }>;
    }>(response);

    assert.equal(response.status, 200);
    assert.equal(body.cwd, process.cwd());
    assert.deepEqual(body.sessions.map((session) => session.id), ['thread-managed', 'thread-free']);
    assert.equal(body.sessions[0]?.title, 'Managed thread');
    assert.equal(body.sessions[0]?.managedSessionId, managed.id);
    assert.equal(body.sessions[1]?.managedSessionId, null);
  } finally {
    await closeTestHub(context);
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('Codex session preview API returns transcript sample', async () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const context = createTestApp({ codexHome });

  try {
    writeCodexSession(codexHome, 'thread-preview', process.cwd(), 'Preview thread', '2026-06-03T10:00:00.000Z', [
      ['user', 'preview prompt', '2026-06-03T10:01:00.000Z'],
      ['assistant', 'preview answer', '2026-06-03T10:02:00.000Z'],
    ]);

    const response = await context.app.request(
      '/api/codex/sessions/thread-preview/preview',
      { headers: authHeaders(context.config) },
    );
    const body = await json<{
      id: string;
      title: string;
      messageCount: number;
      messages: Array<{ role: string; content: string }>;
      managedSessionId: string | null;
    }>(response);

    assert.equal(response.status, 200);
    assert.equal(body.id, 'thread-preview');
    assert.equal(body.title, 'Preview thread');
    assert.equal(body.messageCount, 2);
    assert.deepEqual(body.messages.map((message) => [message.role, message.content]), [
      ['user', 'preview prompt'],
      ['assistant', 'preview answer'],
    ]);
    assert.equal(body.managedSessionId, null);
  } finally {
    await closeTestHub(context);
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('session adopt API imports Codex transcript when requested', async () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const context = createTestApp({ codexHome });

  try {
    writeCodexSession(codexHome, 'thread-import', process.cwd(), 'Imported thread', '2026-06-03T10:00:00.000Z', [
      ['user', 'historical prompt', '2026-06-03T10:01:00.000Z'],
      ['assistant', 'historical answer', '2026-06-03T10:02:00.000Z'],
    ]);

    const response = await context.app.request('/api/sessions/adopt', {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({
        threadId: 'thread-import',
        cwd: process.cwd(),
        title: 'Imported thread',
        importTranscript: true,
      }),
    });
    const session = await json<{ id: string; codexThreadId: string | null }>(response);
    const detail = await json<{
      messages: Array<{ role: string; kind: string; content: string; metadata: { source?: string }; createdAt: number }>;
    }>(await context.app.request(
      `/api/sessions/${encodeURIComponent(session.id)}`,
      { headers: authHeaders(context.config) },
    ));

    assert.equal(response.status, 201);
    assert.equal(session.codexThreadId, 'thread-import');
    assert.deepEqual(detail.messages.map((message) => [message.role, message.kind, message.content, message.metadata.source]), [
      ['user', 'text', 'historical prompt', 'codex-transcript'],
      ['assistant', 'text', 'historical answer', 'codex-transcript'],
    ]);
    assert.equal(detail.messages[0]?.createdAt, Date.parse('2026-06-03T10:01:00.000Z'));
  } finally {
    await closeTestHub(context);
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('session create API stores runtime config overrides', async () => {
  const context = createTestApp();

  try {
    const response = await context.app.request('/api/sessions', {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({
        cwd: process.cwd(),
        title: 'Search session',
        config: {
          search: true,
          permissionMode: 'read-only',
          model: 'gpt-5.5',
          reasoningEffort: 'high',
        },
      }),
    });
    const session = await json<{
      title: string;
      config: { search: boolean; permissionMode: string; model: string; reasoningEffort: string };
    }>(response);

    assert.equal(response.status, 201);
    assert.equal(session.title, 'Search session');
    assert.equal(session.config.search, true);
    assert.equal(session.config.permissionMode, 'read-only');
    assert.equal(session.config.model, 'gpt-5.5');
    assert.equal(session.config.reasoningEffort, 'high');
  } finally {
    await closeTestHub(context);
  }
});

test('session config API updates idle session runtime flags', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const response = await context.app.request(`/api/sessions/${encodeURIComponent(session.id)}/config`, {
      method: 'PATCH',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({
        config: {
          search: true,
          permissionMode: 'yolo',
          model: 'auto',
          reasoningEffort: 'default',
        },
      }),
    });
    const updated = await json<{
      config: { search: boolean; permissionMode: string; model?: string; reasoningEffort?: string };
    }>(response);

    assert.equal(response.status, 200);
    assert.equal(updated.config.search, true);
    assert.equal(updated.config.permissionMode, 'yolo');
    assert.equal(updated.config.model, undefined);
    assert.equal(updated.config.reasoningEffort, undefined);
  } finally {
    await closeTestHub(context);
  }
});

test('session config API rejects invalid model options', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const response = await context.app.request(`/api/sessions/${encodeURIComponent(session.id)}/config`, {
      method: 'PATCH',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({
        config: {
          model: 'custom-model',
        },
      }),
    });

    assert.equal(response.status, 400);
  } finally {
    await closeTestHub(context);
  }
});

test('session config API rejects active sessions', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store, 'session-1', 'running');
    const response = await context.app.request(`/api/sessions/${encodeURIComponent(session.id)}/config`, {
      method: 'PATCH',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ config: { search: true } }),
    });

    assert.equal(response.status, 409);
  } finally {
    await closeTestHub(context);
  }
});

test('session adopt API rejects duplicate Codex threads', async () => {
  const context = createTestApp();

  try {
    context.hub.adoptCodexThread({ threadId: 'thread-1', cwd: process.cwd() });

    const response = await context.app.request('/api/sessions/adopt', {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ threadId: 'thread-1', cwd: process.cwd() }),
    });

    assert.equal(response.status, 409);
  } finally {
    await closeTestHub(context);
  }
});

test('session adopt API rejects missing required fields', async () => {
  const context = createTestApp();

  try {
    const response = await context.app.request('/api/sessions/adopt', {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ cwd: process.cwd() }),
    });

    assert.equal(response.status, 400);
  } finally {
    await closeTestHub(context);
  }
});

test('approval resolve API records caller control type', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const approval = context.store.createApproval({
      id: 'approval-1',
      sessionId: session.id,
      type: 'tool',
      toolName: 'CodexBash',
      input: { command: 'pwd' },
      status: 'pending',
      decision: null,
      response: null,
      createdAt: 10,
      resolvedAt: null,
      source: null,
    });

    const response = await context.app.request(`/api/approvals/${encodeURIComponent(approval.id)}/resolve`, {
      method: 'POST',
      headers: jsonHeaders(context.config),
      body: JSON.stringify({ decision: 'approved', controlType: 'cli' }),
    });

    assert.equal(response.status, 200);
    assert.equal(context.store.getApproval(approval.id)?.source, 'cli');
  } finally {
    await closeTestHub(context);
  }
});

test('session detail exposes latest event cursor for SSE bootstrap', async () => {
  const context = createTestApp();
  const abort = new AbortController();

  try {
    const session = createSession(context.store);
    const event = context.store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'historical' }, createdAt: 10 });

    const detail = await json<{ eventCursor: number }>(await context.app.request(
      `/api/sessions/${encodeURIComponent(session.id)}`,
      { headers: authHeaders(context.config) },
    ));
    assert.equal(detail.eventCursor, event.id);

    const response = await context.app.request(
      `/api/events?sessionId=${encodeURIComponent(session.id)}&afterId=${detail.eventCursor}`,
      { headers: authHeaders(context.config), signal: abort.signal },
    );
    const text = await readInitialSse(response, abort);

    assert.equal(response.status, 200);
    assert.match(text, /"type":"ready"/);
    assert.doesNotMatch(text, /"marker":"historical"/);
  } finally {
    abort.abort();
    await closeTestHub(context);
  }
});

test('status exposes browser bootstrap metadata', async () => {
  const context = createTestApp();

  try {
    const session = createSession(context.store);
    const event = context.store.addEvent({ type: 'session.updated', sessionId: session.id, payload: { marker: 'status' }, createdAt: 10 });

    const status = await json<{
      homePath: string;
      eventCursor: number;
      codexDefaults: { permissionMode: string; search: boolean };
      codexRuntimeDefaults: { model: string; reasoningEffort: string };
    }>(await context.app.request(
      '/api/status',
      { headers: authHeaders(context.config) },
    ));

    assert.equal(status.homePath, homedir());
    assert.equal(status.eventCursor, event.id);
    assert.equal(status.codexDefaults.permissionMode, 'default');
    assert.equal(status.codexDefaults.search, true);
    assert.equal(typeof status.codexRuntimeDefaults.model, 'string');
    assert.equal(typeof status.codexRuntimeDefaults.reasoningEffort, 'string');
  } finally {
    await closeTestHub(context);
  }
});

test('web static routes serve Vite assets and keep API JSON boundaries', async () => {
  const context = createTestApp();

  try {
    const page = await context.app.request('/', { headers: { Accept: 'text/html' } });
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') || '', /text\/html/);
    assert.match(html, /\/assets\/main\.css/);
    assert.match(html, /\/assets\/main\.js/);
    assert.doesNotMatch(html, /\/client\.ts/);

    const css = await context.app.request('/assets/main.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type') || '', /text\/css/);
    assert.match(await css.text(), /\.shell/);

    const js = await context.app.request('/assets/main.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type') || '', /javascript/);
    assert.match(await js.text(), /withCredentials: true/);

    const missingAsset = await context.app.request('/assets/missing.js', { headers: { Accept: 'text/html' } });
    assert.equal(missingAsset.status, 404);
    assert.match(missingAsset.headers.get('content-type') || '', /application\/json/);

    const unauthorized = await context.app.request('/api/status');
    assert.equal(unauthorized.status, 401);

    const apiMissing = await context.app.request('/api/not-found', { headers: authHeaders(context.config) });
    assert.equal(apiMissing.status, 404);
    assert.match(apiMissing.headers.get('content-type') || '', /application\/json/);
    assert.deepEqual(await apiMissing.json(), { error: { message: 'Not found' } });

    const fallback = await context.app.request('/sessions/local', { headers: { Accept: 'text/html' } });
    assert.equal(fallback.status, 200);
    assert.match(await fallback.text(), /\/assets\/main\.js/);
  } finally {
    await closeTestHub(context);
  }
});

test('web, API, and event routes mount below publicUrl path', async () => {
  const context = createTestApp({
    configure: (config) => {
      config.server.publicUrl = 'https://gateway.1662803.xyz/apps/cx-tg';
    },
  });
  const abort = new AbortController();

  try {
    const session = createSession(context.store);

    const redirect = await context.app.request('/apps/cx-tg');
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), '/apps/cx-tg/');

    const page = await context.app.request('/apps/cx-tg/', { headers: { Accept: 'text/html' } });
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.match(html, /<base href="\/apps\/cx-tg\/">/);
    assert.match(html, /window\.__CX_TG_BASE_PATH__="\/apps\/cx-tg"/);
    assert.match(html, /\/apps\/cx-tg\/assets\/main\.css/);
    assert.match(html, /\/apps\/cx-tg\/assets\/main\.js/);

    const css = await context.app.request('/apps/cx-tg/assets/main.css');
    assert.equal(css.status, 200);
    assert.match(await css.text(), /\.shell/);

    const rootApi = await context.app.request('/api/status', { headers: authHeaders(context.config) });
    assert.equal(rootApi.status, 404);

    const login = await context.app.request('/apps/cx-tg/api/auth', {
      method: 'POST',
      headers: authHeaders(context.config),
    });
    const cookie = login.headers.get('set-cookie') || '';
    assert.equal(login.status, 200);
    assert.match(cookie, /Path=\/apps\/cx-tg/);
    assert.match(cookie, /Secure/);

    const status = await json<{ server: { basePath: string } }>(await context.app.request(
      '/apps/cx-tg/api/status',
      { headers: { Cookie: cookie } },
    ));
    assert.equal(status.server.basePath, '/apps/cx-tg');

    const events = await context.app.request(
      `/apps/cx-tg/api/events?sessionId=${encodeURIComponent(session.id)}`,
      { headers: { Cookie: cookie }, signal: abort.signal },
    );
    const text = await readInitialSse(events, abort);
    assert.equal(events.status, 200);
    assert.match(text, /"type":"ready"/);
  } finally {
    abort.abort();
    await closeTestHub(context);
  }
});

function writeCodexSession(
  codexHome: string,
  id: string,
  cwd: string,
  title: string,
  timestamp: string,
  messages: Array<['user' | 'assistant', string, string]> = [],
): void {
  mkdirSync(join(codexHome, 'sessions', '2026', '06', '03'), { recursive: true });
  writeFileSync(join(codexHome, 'session_index.jsonl'), [
    JSON.stringify({ id, thread_name: title, updated_at: timestamp }),
    '',
  ].join('\n'), { flag: 'a' });
  writeFileSync(join(codexHome, 'sessions', '2026', '06', '03', `rollout-${id}.jsonl`), [
    JSON.stringify({
      timestamp,
      type: 'session_meta',
      payload: {
        id,
        timestamp,
        cwd,
        originator: 'codex-tui',
        thread_source: 'local',
      },
    }),
    JSON.stringify({ timestamp, type: 'event_msg', payload: { type: 'user_message', message: 'event message title' } }),
    ...messages.map(([role, content, createdAt]) => JSON.stringify({
      timestamp: createdAt,
      type: 'response_item',
      payload: {
        type: 'message',
        role,
        content: [{ type: role === 'user' ? 'input_text' : 'output_text', text: content }],
      },
    })),
    '',
  ].join('\n'));
}
