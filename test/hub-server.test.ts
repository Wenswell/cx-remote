import { strict as assert } from 'node:assert';
import test from 'node:test';
import { configureLogger } from '../src/logger.js';
import { webPage } from '../src/web/page.js';
import { webScript } from '../src/web/script.js';
import { webStyles } from '../src/web/styles.js';
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

test('web page loads split assets and client uses cookie event stream', () => {
  const page = webPage();
  const script = webScript();
  const styles = webStyles();

  assert.match(page, /\/assets\/web\.css/);
  assert.match(page, /\/assets\/web\.js/);
  assert.match(page, /Take control/);
  assert.match(page, /Delete session/);
  assert.match(script, /new EventSource\(url, \{ withCredentials: true \}\)/);
  assert.doesNotMatch(script, /token=/);
  assert.match(script, /eventSourceSessionId === sessionId/);
  assert.match(script, /params\.set\('afterId'/);
  assert.match(script, /!messages\.some\(\(item\) => item\.id === message\.id\)/);
  assert.doesNotMatch(script, /event\.currentTarget\.reset\(\)/);
  assert.match(script, /const formElement = event\.currentTarget/);
  assert.match(script, /function renderActionState\(\)/);
  assert.match(script, /\$\('stop'\)\.hidden = !hasSession \|\| !hasActiveWork/);
  assert.match(script, /function renderSessionHeader\(\)/);
  assert.match(script, /function metaChip\(label, value\)/);
  assert.match(script, /function shortId\(value\)/);
  assert.match(styles, /\.shell \{/);
  assert.match(styles, /height: 100vh/);
  assert.match(styles, /grid-template-rows: auto auto minmax\(0, 1fr\) auto/);
});
