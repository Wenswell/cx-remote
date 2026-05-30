import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import type { AppConfig } from '../src/config/config.js';
import type { PromptJob, Session } from '../src/domain/types.js';
import { EventBus } from '../src/runtime/event-bus.js';
import { ControlHub } from '../src/runtime/control-hub.js';
import { PermissionService } from '../src/runtime/permissions.js';
import { Store } from '../src/store/store.js';

test('prompt jobs persist and keep FIFO order', () => {
  const dbPath = tempDbPath();
  let store = new Store(dbPath);
  const session = createSession(store);

  createPromptJob(store, session.id, 'job-1', 'first', 10);
  createPromptJob(store, session.id, 'job-2', 'second', 20);
  store.close();

  store = new Store(dbPath);
  try {
    const jobs = store.listPromptJobs({ sessionId: session.id, statuses: ['queued'] });
    assert.deepEqual(jobs.map((job) => job.text), ['first', 'second']);
    assert.equal(store.getNextQueuedPromptJob(session.id)?.id, 'job-1');
    assert.equal(store.stats().queuedPrompts, 2);
  } finally {
    store.close();
    cleanupDb(dbPath);
  }
});

test('prompt job status transitions update queue counts', () => {
  withStore((store) => {
    const session = createSession(store);
    const job = createPromptJob(store, session.id, 'job-1', 'hello', 10);

    const running = store.updatePromptJobStatus(job.id, 'running', { startedAt: 20 });
    assert.equal(running?.status, 'running');
    assert.equal(running?.startedAt, 20);
    assert.equal(store.stats().queuedPrompts, 0);

    const done = store.updatePromptJobStatus(job.id, 'done', { error: null, finishedAt: 30 });
    assert.equal(done?.status, 'done');
    assert.equal(done?.finishedAt, 30);
    assert.equal(store.countPromptJobs(['done'], session.id), 1);
  });
});

test('cancelPromptJobs cancels queued and running prompts for a session', () => {
  withStore((store) => {
    const session = createSession(store);
    createPromptJob(store, session.id, 'job-1', 'running', 10, 'running');
    createPromptJob(store, session.id, 'job-2', 'queued', 20);

    assert.equal(store.cancelPromptJobs(session.id, ['queued', 'running'], 'stopped'), 2);
    const jobs = store.listPromptJobs({ sessionId: session.id, statuses: ['canceled'] });

    assert.deepEqual(jobs.map((job) => job.id), ['job-1', 'job-2']);
    assert.deepEqual(jobs.map((job) => job.error), ['stopped', 'stopped']);
    assert.equal(store.stats().queuedPrompts, 0);
  });
});

test('running prompts can be failed during restart recovery', () => {
  withStore((store) => {
    const session = createSession(store);
    createPromptJob(store, session.id, 'job-1', 'running', 10, 'running');
    createPromptJob(store, session.id, 'job-2', 'queued', 20);

    assert.equal(store.failRunningPromptJobs('restart'), 1);

    assert.equal(store.getPromptJob('job-1')?.status, 'failed');
    assert.equal(store.getPromptJob('job-1')?.error, 'restart');
    assert.equal(store.getPromptJob('job-2')?.status, 'queued');
    assert.deepEqual(store.listSessionsWithQueuedPromptJobs(), [session.id]);
  });
});

test('ControlHub persists queued prompts while a session is busy', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const config = createConfig(dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);
  const hub = new ControlHub(config, store, events, permissions);

  try {
    const session = createSession(store, 'session-1', 'running');
    const message = await hub.sendMessage(session.id, 'queued prompt', 'cli');
    const jobs = store.listPromptJobs({ sessionId: session.id, statuses: ['queued'] });

    assert.equal(message.metadata.queued, true);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.text, 'queued prompt');
    assert.equal(store.stats().queuedPrompts, 1);
  } finally {
    await hub.shutdown();
    store.close();
    cleanupDb(dbPath);
  }
});

test('deleting a session deletes its prompt jobs', () => {
  withStore((store) => {
    const session = createSession(store);
    createPromptJob(store, session.id, 'job-1', 'hello', 10);

    assert.equal(store.deleteSession(session.id), true);
    assert.equal(store.listPromptJobs({ sessionId: session.id }).length, 0);
  });
});

function withStore(fn: (store: Store) => void): void {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  try {
    fn(store);
  } finally {
    store.close();
    cleanupDb(dbPath);
  }
}

function createSession(store: Store, id = 'session-1', status: Session['status'] = 'idle'): Session {
  const now = Date.now();
  const session: Session = {
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
  };
  return store.createSession(session);
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

function createPromptJob(
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

function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'cx-tg-test-')), 'cx-tg.db');
}

function cleanupDb(dbPath: string): void {
  rmSync(dirname(dbPath), { recursive: true, force: true });
}
