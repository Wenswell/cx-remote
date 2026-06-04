import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodexSessionCatalog } from '../src/agents/codex/catalog.js';
import { resolveCodexCwdKey } from '../src/agents/codex/sessions.js';
import type { CodexSessionIndexRecord } from '../src/store/store.js';
import { Store } from '../src/store/store.js';
import { cleanupDb, tempDbPath, withStore } from './helpers.js';

test('Store indexes Codex sessions by cwd key and updated time', () => {
  withStore((store) => {
    const cwdKey = resolveCodexCwdKey(process.cwd());
    store.replaceCodexSessions('/tmp/codex-home', [
      codexRecord({ threadId: 'thread-older', cwdKey, title: 'Older', updatedAt: '2026-06-02T10:00:00.000Z' }),
      codexRecord({ threadId: 'thread-newer', cwdKey, title: 'Newer', updatedAt: '2026-06-03T10:00:00.000Z' }),
      codexRecord({ threadId: 'thread-other', cwdKey: resolveCodexCwdKey(tmpdir()), title: 'Other', updatedAt: '2026-06-04T10:00:00.000Z' }),
    ]);

    assert.deepEqual(
      store.listCodexSessions('/tmp/codex-home', cwdKey).map((session) => session.id),
      ['thread-newer', 'thread-older'],
    );

    store.syncCodexSessionTitles('/tmp/codex-home', new Map([
      ['thread-older', { threadName: 'Renamed older', updatedAt: '2026-06-05T10:00:00.000Z' }],
    ]));

    const sessions = store.listCodexSessions('/tmp/codex-home', cwdKey);
    assert.deepEqual(sessions.map((session) => session.id), ['thread-older', 'thread-newer']);
    assert.equal(sessions[0]?.title, 'Renamed older');
  });
});

test('CodexSessionCatalog builds a baseline and applies index title updates', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-remote-codex-home-'));
  const catalog = new CodexSessionCatalog(store, codexHome);

  try {
    writeSessionIndex(codexHome, [
      ['thread-older', 'Older task', '2026-06-02T10:00:00.000Z'],
      ['thread-newer', 'Newer task', '2026-06-03T10:00:00.000Z'],
    ]);
    writeCodexSession(codexHome, 'thread-older', process.cwd(), '2026-06-02T09:00:00.000Z');
    writeCodexSession(codexHome, 'thread-newer', process.cwd(), '2026-06-03T09:00:00.000Z');

    await catalog.ensureReady();

    assert.deepEqual(
      (await catalog.listResumeSessions({ cwd: process.cwd() })).map((session) => session.id),
      ['thread-newer', 'thread-older'],
    );

    writeSessionIndex(codexHome, [
      ['thread-older', 'Renamed older', '2026-06-04T10:00:00.000Z'],
      ['thread-newer', 'Newer task', '2026-06-03T10:00:00.000Z'],
    ]);

    await eventually(async () => {
      const sessions = await catalog.listResumeSessions({ cwd: process.cwd() });
      assert.deepEqual(sessions.map((session) => session.id), ['thread-older', 'thread-newer']);
      assert.equal(sessions[0]?.title, 'Renamed older');
    });
  } finally {
    await catalog.stop();
    store.close();
    cleanupDb(dbPath);
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('CodexSessionCatalog indexes added session files and removes deleted files', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-remote-codex-home-'));
  const catalog = new CodexSessionCatalog(store, codexHome);

  try {
    await catalog.ensureReady();

    writeSessionIndex(codexHome, [
      ['thread-added', 'Added task', '2026-06-03T10:00:00.000Z'],
    ]);
    const filePath = writeCodexSession(codexHome, 'thread-added', process.cwd(), '2026-06-03T09:00:00.000Z');

    await eventually(async () => {
      const sessions = await catalog.listResumeSessions({ cwd: process.cwd() });
      assert.deepEqual(sessions.map((session) => session.id), ['thread-added']);
      assert.equal(sessions[0]?.title, 'Added task');
    });

    unlinkSync(filePath);

    await eventually(async () => {
      assert.deepEqual(await catalog.listResumeSessions({ cwd: process.cwd() }), []);
    });
  } finally {
    await catalog.stop();
    store.close();
    cleanupDb(dbPath);
    rmSync(codexHome, { recursive: true, force: true });
  }
});

function codexRecord(patch: Partial<CodexSessionIndexRecord> & { threadId: string; cwdKey: string }): CodexSessionIndexRecord {
  return {
    codexHome: '/tmp/codex-home',
    threadId: patch.threadId,
    id: patch.threadId,
    cwdKey: patch.cwdKey,
    cwd: patch.cwd ?? process.cwd(),
    filePath: patch.filePath ?? `/tmp/codex-home/sessions/rollout-${patch.threadId}.jsonl`,
    title: patch.title ?? patch.threadId,
    createdAt: patch.createdAt ?? '2026-06-02T09:00:00.000Z',
    updatedAt: patch.updatedAt ?? '2026-06-02T09:00:00.000Z',
    originator: patch.originator ?? 'codex-tui',
    threadSource: patch.threadSource ?? 'local',
  };
}

function writeSessionIndex(codexHome: string, entries: Array<[string, string, string]>): void {
  writeFileSync(join(codexHome, 'session_index.jsonl'), [
    ...entries.map(([id, threadName, updatedAt]) => JSON.stringify({ id, thread_name: threadName, updated_at: updatedAt })),
    '',
  ].join('\n'));
}

function writeCodexSession(codexHome: string, id: string, cwd: string, timestamp: string): string {
  const dir = join(codexHome, 'sessions', '2026', '06', '03');
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `rollout-${id}.jsonl`);
  writeFileSync(filePath, [
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
    JSON.stringify({ timestamp, type: 'event_msg', payload: { type: 'user_message', message: `Title for ${id}` } }),
    '',
  ].join('\n'));
  return filePath;
}

async function eventually(assertion: () => Promise<void>, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw lastError;
}
