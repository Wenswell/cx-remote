import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { listCodexResumeSessions, readCodexSessionPreview, readCodexTranscript } from '../src/agents/codex/sessions.js';

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

test('Codex transcript import reads canonical response item messages only', () => {
  const codexHome = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));
  const cwd = process.cwd();

  try {
    writeCodexSession(codexHome, 'thread-transcript', cwd, '2026-06-03T09:00:00.000Z', 'event title', [
      JSON.stringify({ timestamp: '2026-06-03T09:01:00.000Z', type: 'event_msg', payload: { type: 'user_message', message: 'event user duplicate' } }),
      JSON.stringify({
        timestamp: '2026-06-03T09:02:00.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'actual user prompt' }],
        },
      }),
      JSON.stringify({
        timestamp: '2026-06-03T09:03:00.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'actual assistant answer' }],
        },
      }),
      JSON.stringify({
        timestamp: '2026-06-03T09:04:00.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'developer',
          content: [{ type: 'input_text', text: 'developer instructions' }],
        },
      }),
    ]);

    const messages = readCodexTranscript({ threadId: 'thread-transcript', codexHome });
    assert.deepEqual(messages.map((message) => [message.role, message.content]), [
      ['user', 'actual user prompt'],
      ['assistant', 'actual assistant answer'],
    ]);
    assert.equal(messages[0]?.createdAt, Date.parse('2026-06-03T09:02:00.000Z'));

    const preview = readCodexSessionPreview({ threadId: 'thread-transcript', codexHome, messageLimit: 1 });
    assert.equal(preview?.messageCount, 2);
    assert.deepEqual(preview?.messages.map((message) => message.content), ['actual user prompt']);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

function writeCodexSession(codexHome: string, id: string, cwd: string, timestamp: string, message = 'ignored', extraLines: string[] = []): void {
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
    ...extraLines,
    '',
  ].join('\n'));
}
