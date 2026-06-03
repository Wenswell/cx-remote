import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { listCodexResumeSessions } from '../src/agents/codex/sessions.js';

test('Codex resume sessions are filtered by cwd and sorted by updated time', () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const cwd = process.cwd();
  const otherCwd = tmpdir();

  try {
    writeFileSync(join(codexHome, 'session_index.jsonl'), [
      JSON.stringify({ id: 'thread-older', thread_name: 'Older task', updated_at: '2026-06-02T10:00:00.000Z' }),
      JSON.stringify({ id: 'thread-newer', thread_name: 'Newer task', updated_at: '2026-06-03T10:00:00.000Z' }),
      '',
    ].join('\n'));

    writeCodexSession(codexHome, 'thread-older', cwd, '2026-06-02T09:00:00.000Z');
    writeCodexSession(codexHome, 'thread-newer', cwd, '2026-06-03T09:00:00.000Z');
    writeCodexSession(codexHome, 'thread-other', otherCwd, '2026-06-03T11:00:00.000Z');

    const sessions = listCodexResumeSessions({ cwd, codexHome });

    assert.deepEqual(sessions.map((session) => session.id), ['thread-newer', 'thread-older']);
    assert.equal(sessions[0]?.title, 'Newer task');
    assert.equal(sessions[1]?.title, 'Older task');
    assert.equal(sessions[0]?.cwd, cwd);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('Codex resume session list caps the requested limit', () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const cwd = process.cwd();

  try {
    writeCodexSession(codexHome, 'thread-1', cwd, '2026-06-03T09:00:00.000Z');
    writeCodexSession(codexHome, 'thread-2', cwd, '2026-06-03T10:00:00.000Z');

    const sessions = listCodexResumeSessions({ cwd, codexHome, limit: 1 });

    assert.deepEqual(sessions.map((session) => session.id), ['thread-2']);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('Codex resume session list uses transcript user message when the index has no title', () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const cwd = process.cwd();

  try {
    writeCodexSession(codexHome, 'thread-with-title', cwd, '2026-06-03T09:00:00.000Z', 'Actual prompt title');

    const sessions = listCodexResumeSessions({ cwd, codexHome });

    assert.equal(sessions[0]?.title, 'Actual prompt title');
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

function writeCodexSession(codexHome: string, id: string, cwd: string, timestamp: string, message = 'ignored'): void {
  const dir = join(codexHome, 'sessions', '2026', '06', '03');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `rollout-${id}.jsonl`), [
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
    JSON.stringify({
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'output_text', text: '# AGENTS.md instructions\n<INSTRUCTIONS>' }],
      },
    }),
    JSON.stringify({ type: 'event_msg', payload: { type: 'user_message', message } }),
    '',
  ].join('\n'));
}
