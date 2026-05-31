import { strict as assert } from 'node:assert';
import test from 'node:test';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session } from '../src/domain/types.js';
import { CodexRuntime } from '../src/agents/codex/runtime.js';
import { configureLogger } from '../src/logger.js';

configureLogger({ level: 'error', console: false, prompts: false });

test('CodexRuntime resumes a persisted thread before starting a turn', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cx-tg-runtime-'));
  const fake = createFakeCodexBin(tempDir);
  const runtime = new CodexRuntime({
    bin: fake.bin,
    session: sessionFixture('thread-1'),
    onEvent: () => {},
    onThread: () => {},
    onTurn: () => {},
    onApproval: async () => ({ decision: 'denied' }),
    onChoice: async () => ({ decision: 'cancel' }),
  });

  try {
    await runtime.sendPrompt('hello');
    const methods = readRpcMethods(fake.logPath);

    assert.equal(methods.includes('thread/start'), false);
    assert.deepEqual(methods.filter((method) => method === 'thread/resume' || method === 'turn/start'), [
      'thread/resume',
      'turn/start',
    ]);
  } finally {
    await runtime.stop().catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CodexRuntime starts a new thread when no thread id is stored', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cx-tg-runtime-'));
  const fake = createFakeCodexBin(tempDir);
  const runtime = new CodexRuntime({
    bin: fake.bin,
    session: sessionFixture(null),
    onEvent: () => {},
    onThread: () => {},
    onTurn: () => {},
    onApproval: async () => ({ decision: 'denied' }),
    onChoice: async () => ({ decision: 'cancel' }),
  });

  try {
    await runtime.sendPrompt('hello');
    const methods = readRpcMethods(fake.logPath);

    assert.equal(methods.includes('thread/resume'), false);
    assert.deepEqual(methods.filter((method) => method === 'thread/start' || method === 'turn/start'), [
      'thread/start',
      'turn/start',
    ]);
  } finally {
    await runtime.stop().catch(() => {});
    rmSync(tempDir, { recursive: true, force: true });
  }
});

function sessionFixture(codexThreadId: string | null): Session {
  const now = Date.now();
  return {
    id: 'session-1',
    title: 'Runtime test',
    cwd: process.cwd(),
    agent: 'codex',
    status: 'idle',
    codexThreadId,
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
  };
}

function createFakeCodexBin(tempDir: string): { bin: string; logPath: string } {
  const logPath = join(tempDir, 'rpc.log');
  const bin = join(tempDir, 'fake-codex.js');
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require('node:fs');
const readline = require('node:readline');
const logPath = ${JSON.stringify(logPath)};
const lines = readline.createInterface({ input: process.stdin });

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

lines.on('line', (line) => {
  const message = JSON.parse(line);
  fs.appendFileSync(logPath, JSON.stringify({ method: message.method, params: message.params }) + '\\n');

  if (message.method === 'initialize') {
    send({ id: message.id, result: {} });
    return;
  }

  if (message.method === 'thread/start') {
    send({ id: message.id, result: { thread: { id: 'started-thread' } } });
    send({ method: 'thread/started', params: { thread: { id: 'started-thread' } } });
    return;
  }

  if (message.method === 'thread/resume') {
    send({ id: message.id, result: { thread: { id: message.params.threadId } } });
    send({ method: 'thread/resumed', params: { thread: { id: message.params.threadId } } });
    return;
  }

  if (message.method === 'turn/start') {
    send({ id: message.id, result: { turn: { id: 'turn-1' } } });
    send({ method: 'turn/started', params: { turn: { id: 'turn-1' } } });
    send({ method: 'item/agentMessage/delta', params: { delta: 'ok' } });
    send({ method: 'turn/completed', params: { turn: { id: 'turn-1' }, status: 'completed' } });
  }
});
`);
  chmodSync(bin, 0o755);
  return { bin, logPath };
}

function readRpcMethods(path: string): string[] {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { method: string })
    .map((entry) => entry.method);
}
