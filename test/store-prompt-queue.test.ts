import { strict as assert } from 'node:assert';
import test from 'node:test';
import { EventBus } from '../src/runtime/event-bus.js';
import { PermissionService } from '../src/runtime/permissions.js';
import { Store } from '../src/store/store.js';
import { configureLogger } from '../src/logger.js';
import {
  cleanupDb,
  closeTestHub,
  createConfig,
  createPromptJob,
  createSession,
  createTestHub,
  tempDbPath,
  withStore,
} from './helpers.js';

configureLogger({ level: 'error', console: false, prompts: false });

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
  const context = createTestHub();

  try {
    const session = createSession(context.store, 'session-1', 'running');
    const message = await context.hub.sendMessage(session.id, 'queued prompt', 'cli');
    const jobs = context.store.listPromptJobs({ sessionId: session.id, statuses: ['queued'] });

    assert.equal(message.metadata.queued, true);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.text, 'queued prompt');
    assert.equal(context.store.stats().queuedPrompts, 1);
  } finally {
    await closeTestHub(context);
  }
});

test('PermissionService expires pending approvals and resolves waiters', async () => {
  const dbPath = tempDbPath();
  const store = new Store(dbPath);
  const config = createConfig(dbPath);
  const events = new EventBus(store);
  const permissions = new PermissionService(store, events, config);

  try {
    const session = createSession(store);
    const resultPromise = permissions.requestApproval(session.id, 'CodexBash', { command: 'rm file' });
    const pending = store.listPendingApprovals(session.id);

    assert.equal(pending.length, 1);
    assert.equal(permissions.expireSessionApprovals(session.id, 'restart'), 1);
    assert.deepEqual(await resultPromise, { decision: 'denied', reason: 'restart' });

    const approval = store.getApproval(pending[0]!.id);
    assert.equal(approval?.status, 'expired');
    assert.equal(approval?.decision, 'expired');
    assert.equal(store.listPendingApprovals(session.id).length, 0);
  } finally {
    permissions.shutdown();
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
