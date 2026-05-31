import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Approval, ControlBinding, HubEvent, Message, PromptJob, PromptJobStatus, Session } from '../domain/types.js';

type SqlValue = string | number | null;
export type ApprovalQuery = {
  sessionId?: string;
  status?: Approval['status'];
  limit?: number;
};

export type MessageQuery = {
  limit?: number;
  afterId?: string;
};

export type PromptJobQuery = {
  sessionId?: string;
  statuses?: PromptJobStatus[];
  limit?: number;
};

export type SessionControlInput = {
  controlOwner: Session['controlOwner'];
  controlOwnerId: string | null;
  controlLabel: string | null;
  controlLeaseExpiresAt: number | null;
  controlUpdatedAt: number | null;
};

type SessionRow = Omit<Session, 'config'> & { config_json: string };
type MessageRow = Omit<Message, 'metadata'> & { metadata_json: string };
type ApprovalRow = Omit<Approval, 'input' | 'response'> & { input_json: string; response_json: string | null };
type PromptJobRow = PromptJob;
type EventRow = Omit<HubEvent, 'payload'> & { payload_json: string };

export class Store {
  private readonly db: DatabaseSync;

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  createSession(session: Session): Session {
    this.db.prepare(`
      INSERT INTO sessions (
        id, title, cwd, agent, status, codexThreadId, currentTurnId,
        controlOwner, controlOwnerId, controlLabel, controlLeaseExpiresAt, controlUpdatedAt,
        config_json, createdAt, updatedAt, lastError
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.title,
      session.cwd,
      session.agent,
      session.status,
      session.codexThreadId,
      session.currentTurnId,
      session.controlOwner,
      session.controlOwnerId,
      session.controlLabel,
      session.controlLeaseExpiresAt,
      session.controlUpdatedAt,
      JSON.stringify(session.config),
      session.createdAt,
      session.updatedAt,
      session.lastError,
    );
    return session;
  }

  updateSession(session: Session): Session {
    this.db.prepare(`
      UPDATE sessions SET
        title = ?,
        cwd = ?,
        agent = ?,
        status = ?,
        codexThreadId = ?,
        currentTurnId = ?,
        controlOwner = ?,
        controlOwnerId = ?,
        controlLabel = ?,
        controlLeaseExpiresAt = ?,
        controlUpdatedAt = ?,
        config_json = ?,
        updatedAt = ?,
        lastError = ?
      WHERE id = ?
    `).run(
      session.title,
      session.cwd,
      session.agent,
      session.status,
      session.codexThreadId,
      session.currentTurnId,
      session.controlOwner,
      session.controlOwnerId,
      session.controlLabel,
      session.controlLeaseExpiresAt,
      session.controlUpdatedAt,
      JSON.stringify(session.config),
      session.updatedAt,
      session.lastError,
      session.id,
    );
    return session;
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
    return row ? decodeSession(row) : null;
  }

  listSessions(): Session[] {
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY updatedAt DESC').all() as SessionRow[];
    return rows.map(decodeSession);
  }

  createMessage(message: Message): Message {
    this.db.prepare(`
      INSERT INTO messages (id, sessionId, role, kind, content, metadata_json, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      message.sessionId,
      message.role,
      message.kind,
      message.content,
      JSON.stringify(message.metadata),
      message.createdAt,
    );
    return message;
  }

  listMessages(sessionId: string, input: number | MessageQuery = 200): Message[] {
    const query = typeof input === 'number' ? { limit: input } : input;
    const limit = normalizeLimit(query.limit, 200);
    if (query.afterId) {
      const cursor = this.db.prepare('SELECT rowid FROM messages WHERE sessionId = ? AND id = ?')
        .get(sessionId, query.afterId) as { rowid: number } | undefined;
      if (!cursor) return [];
      const rows = this.db.prepare(`
        SELECT * FROM messages
        WHERE sessionId = ? AND rowid > ?
        ORDER BY rowid ASC
        LIMIT ?
      `).all(sessionId, cursor.rowid, limit) as MessageRow[];
      return rows.map(decodeMessage);
    }

    const rows = this.db.prepare(`
      SELECT * FROM messages
      WHERE sessionId = ?
      ORDER BY rowid DESC
      LIMIT ?
    `).all(sessionId, limit) as MessageRow[];
    return rows.reverse().map(decodeMessage);
  }

  createApproval(approval: Approval): Approval {
    this.db.prepare(`
      INSERT INTO approvals (
        id, sessionId, type, toolName, input_json, status, decision,
        response_json, createdAt, resolvedAt, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      approval.id,
      approval.sessionId,
      approval.type,
      approval.toolName,
      JSON.stringify(approval.input),
      approval.status,
      approval.decision,
      approval.response === null ? null : JSON.stringify(approval.response),
      approval.createdAt,
      approval.resolvedAt,
      approval.source,
    );
    return approval;
  }

  updateApproval(approval: Approval): Approval {
    this.db.prepare(`
      UPDATE approvals SET
        status = ?,
        decision = ?,
        response_json = ?,
        resolvedAt = ?,
        source = ?
      WHERE id = ?
    `).run(
      approval.status,
      approval.decision,
      approval.response === null ? null : JSON.stringify(approval.response),
      approval.resolvedAt,
      approval.source,
      approval.id,
    );
    return approval;
  }

  getApproval(id: string): Approval | null {
    const row = this.db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as ApprovalRow | undefined;
    return row ? decodeApproval(row) : null;
  }

  listPendingApprovals(sessionId?: string): Approval[] {
    const rows = sessionId
      ? this.db.prepare('SELECT * FROM approvals WHERE status = ? AND sessionId = ? ORDER BY createdAt ASC').all('pending', sessionId) as ApprovalRow[]
      : this.db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY createdAt ASC').all('pending') as ApprovalRow[];
    return rows.map(decodeApproval);
  }

  listApprovals(query: ApprovalQuery = {}): Approval[] {
    const limit = normalizeLimit(query.limit, 100);
    const where = buildWhere([
      equalClause('sessionId', query.sessionId),
      equalClause('status', query.status),
    ]);
    const rows = this.db.prepare(`
      SELECT * FROM approvals
      ${where.sql}
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(...where.params, limit) as ApprovalRow[];
    return rows.map(decodeApproval);
  }

  createPromptJob(job: PromptJob): PromptJob {
    this.db.prepare(`
      INSERT INTO prompt_jobs (
        id, sessionId, text, source, ownerId, controlLabel, status, error,
        createdAt, updatedAt, startedAt, finishedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.sessionId,
      job.text,
      job.source,
      job.ownerId,
      job.controlLabel,
      job.status,
      job.error,
      job.createdAt,
      job.updatedAt,
      job.startedAt,
      job.finishedAt,
    );
    return job;
  }

  updatePromptJob(job: PromptJob): PromptJob {
    this.db.prepare(`
      UPDATE prompt_jobs SET
        text = ?,
        source = ?,
        ownerId = ?,
        controlLabel = ?,
        status = ?,
        error = ?,
        updatedAt = ?,
        startedAt = ?,
        finishedAt = ?
      WHERE id = ?
    `).run(
      job.text,
      job.source,
      job.ownerId,
      job.controlLabel,
      job.status,
      job.error,
      job.updatedAt,
      job.startedAt,
      job.finishedAt,
      job.id,
    );
    return job;
  }

  getPromptJob(id: string): PromptJob | null {
    const row = this.db.prepare('SELECT * FROM prompt_jobs WHERE id = ?').get(id) as PromptJobRow | undefined;
    return row ? decodePromptJob(row) : null;
  }

  listPromptJobs(query: PromptJobQuery = {}): PromptJob[] {
    const limit = normalizeLimit(query.limit, 200);
    const statuses = uniqueStatuses(query.statuses);
    const where = buildWhere([
      equalClause('sessionId', query.sessionId),
      inClause('status', statuses),
    ]);
    const rows = this.db.prepare(`
      SELECT * FROM prompt_jobs
      ${where.sql}
      ORDER BY createdAt ASC, rowid ASC
      LIMIT ?
    `).all(...where.params, limit) as unknown as PromptJobRow[];
    return rows.map(decodePromptJob);
  }

  getNextQueuedPromptJob(sessionId: string): PromptJob | null {
    const row = this.db.prepare(`
      SELECT * FROM prompt_jobs
      WHERE sessionId = ? AND status = 'queued'
      ORDER BY createdAt ASC, rowid ASC
      LIMIT 1
    `).get(sessionId) as PromptJobRow | undefined;
    return row ? decodePromptJob(row) : null;
  }

  getRunningPromptJob(sessionId: string): PromptJob | null {
    const row = this.db.prepare(`
      SELECT * FROM prompt_jobs
      WHERE sessionId = ? AND status = 'running'
      ORDER BY startedAt ASC, rowid ASC
      LIMIT 1
    `).get(sessionId) as PromptJobRow | undefined;
    return row ? decodePromptJob(row) : null;
  }

  updatePromptJobStatus(
    id: string,
    status: PromptJobStatus,
    patch: { error?: string | null; startedAt?: number | null; finishedAt?: number | null } = {},
  ): PromptJob | null {
    const current = this.getPromptJob(id);
    if (!current) return null;
    return this.updatePromptJob({
      ...current,
      status,
      error: patch.error === undefined ? current.error : patch.error,
      startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt,
      finishedAt: patch.finishedAt === undefined ? current.finishedAt : patch.finishedAt,
      updatedAt: Date.now(),
    });
  }

  cancelPromptJobs(sessionId: string, statuses: PromptJobStatus[], error: string | null): number {
    const targets = uniqueStatuses(statuses);
    if (targets.length === 0) return 0;
    const now = Date.now();
    const result = this.db.prepare(`
      UPDATE prompt_jobs SET
        status = 'canceled',
        error = ?,
        updatedAt = ?,
        finishedAt = COALESCE(finishedAt, ?)
      WHERE sessionId = ? AND status IN (${targets.map(() => '?').join(', ')})
    `).run(error, now, now, sessionId, ...targets);
    return Number(result.changes);
  }

  failRunningPromptJobs(error: string): number {
    const now = Date.now();
    const result = this.db.prepare(`
      UPDATE prompt_jobs SET
        status = 'failed',
        error = ?,
        updatedAt = ?,
        finishedAt = COALESCE(finishedAt, ?)
      WHERE status = 'running'
    `).run(error, now, now);
    return Number(result.changes);
  }

  listSessionsWithQueuedPromptJobs(): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT sessionId FROM prompt_jobs
      WHERE status = 'queued'
      ORDER BY sessionId ASC
    `).all() as Array<{ sessionId: string }>;
    return rows.map((row) => row.sessionId);
  }

  updateSessionTitle(id: string, title: string): Session | null {
    const current = this.getSession(id);
    if (!current) return null;
    const next = {
      ...current,
      title,
      updatedAt: Date.now(),
    };
    return this.updateSession(next);
  }

  deleteSession(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  updateSessionControl(id: string, input: SessionControlInput): Session | null {
    const current = this.getSession(id);
    if (!current) return null;
    const next = {
      ...current,
      ...input,
      updatedAt: Date.now(),
    };
    return this.updateSession(next);
  }

  upsertBinding(binding: ControlBinding): ControlBinding {
    this.db.prepare(`
      INSERT INTO bindings (id, controlType, externalId, sessionId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(controlType, externalId) DO UPDATE SET
        sessionId = excluded.sessionId,
        updatedAt = excluded.updatedAt
    `).run(
      binding.id,
      binding.controlType,
      binding.externalId,
      binding.sessionId,
      binding.createdAt,
      binding.updatedAt,
    );
    return binding;
  }

  getBinding(controlType: string, externalId: string): ControlBinding | null {
    return this.db.prepare('SELECT * FROM bindings WHERE controlType = ? AND externalId = ?')
      .get(controlType, externalId) as ControlBinding | undefined ?? null;
  }

  listBindings(controlType?: string): ControlBinding[] {
    return controlType
      ? this.db.prepare('SELECT * FROM bindings WHERE controlType = ? ORDER BY updatedAt DESC').all(controlType) as unknown as ControlBinding[]
      : this.db.prepare('SELECT * FROM bindings ORDER BY updatedAt DESC').all() as unknown as ControlBinding[];
  }

  addEvent(event: HubEvent): HubEvent {
    const result = this.db.prepare(`
      INSERT INTO events (type, sessionId, payload_json, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(event.type, event.sessionId, JSON.stringify(event.payload), event.createdAt);
    return { ...event, id: Number(result.lastInsertRowid) };
  }

  listEvents(afterId = 0, sessionId?: string): HubEvent[] {
    const rows = sessionId
      ? this.db.prepare('SELECT * FROM events WHERE id > ? AND sessionId = ? ORDER BY id ASC').all(afterId, sessionId) as EventRow[]
      : this.db.prepare('SELECT * FROM events WHERE id > ? ORDER BY id ASC').all(afterId) as EventRow[];
    return rows.map(decodeEvent);
  }

  latestEventId(sessionId?: string): number {
    const row = sessionId
      ? this.db.prepare('SELECT id FROM events WHERE sessionId = ? ORDER BY id DESC LIMIT 1').get(sessionId) as { id: number } | undefined
      : this.db.prepare('SELECT id FROM events ORDER BY id DESC LIMIT 1').get() as { id: number } | undefined;
    return row ? Number(row.id) : 0;
  }

  countPromptJobs(statuses: PromptJobStatus[], sessionId?: string): number {
    const targets = uniqueStatuses(statuses);
    if (targets.length === 0) return 0;
    const where = buildWhere([
      inClause('status', targets),
      equalClause('sessionId', sessionId),
    ]);
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM prompt_jobs
      ${where.sql}
    `).get(...where.params) as { count: number };
    return Number(row.count);
  }

  stats(): { sessions: number; messages: number; pendingApprovals: number; queuedPrompts: number } {
    return {
      sessions: scalar(this.db, 'SELECT COUNT(*) FROM sessions'),
      messages: scalar(this.db, 'SELECT COUNT(*) FROM messages'),
      pendingApprovals: scalar(this.db, "SELECT COUNT(*) FROM approvals WHERE status = 'pending'"),
      queuedPrompts: this.countPromptJobs(['queued']),
    };
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cwd TEXT NOT NULL,
        agent TEXT NOT NULL,
        status TEXT NOT NULL,
        codexThreadId TEXT,
        currentTurnId TEXT,
        controlOwner TEXT,
        controlOwnerId TEXT,
        controlLabel TEXT,
        controlLeaseExpiresAt INTEGER,
        controlUpdatedAt INTEGER,
        config_json TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        lastError TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session_created
        ON messages(sessionId, createdAt);

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        toolName TEXT NOT NULL,
        input_json TEXT NOT NULL,
        status TEXT NOT NULL,
        decision TEXT,
        response_json TEXT,
        createdAt INTEGER NOT NULL,
        resolvedAt INTEGER,
        source TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_approvals_status_session
        ON approvals(status, sessionId, createdAt);

      CREATE TABLE IF NOT EXISTS prompt_jobs (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        source TEXT NOT NULL,
        ownerId TEXT,
        controlLabel TEXT,
        status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed', 'canceled')),
        error TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        startedAt INTEGER,
        finishedAt INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_prompt_jobs_session_status_created
        ON prompt_jobs(sessionId, status, createdAt);

      CREATE TABLE IF NOT EXISTS bindings (
        id TEXT PRIMARY KEY,
        controlType TEXT NOT NULL,
        externalId TEXT NOT NULL,
        sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        UNIQUE(controlType, externalId)
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        sessionId TEXT,
        payload_json TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_session_id
        ON events(sessionId, id);
    `);
    this.ensureSessionControlColumns();
  }

  private ensureSessionControlColumns(): void {
    const columns = new Set((this.db.prepare('PRAGMA table_info(sessions)').all() as Array<{ name: string }>).map((column) => column.name));
    const additions = [
      ['controlOwner', 'TEXT'],
      ['controlOwnerId', 'TEXT'],
      ['controlLabel', 'TEXT'],
      ['controlLeaseExpiresAt', 'INTEGER'],
      ['controlUpdatedAt', 'INTEGER'],
    ] as const;
    for (const [name, type] of additions) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE sessions ADD COLUMN ${name} ${type}`);
    }
  }
}

function scalar(db: DatabaseSync, sql: string): number {
  const row = db.prepare(sql).get() as { 'COUNT(*)': number };
  return Number(row['COUNT(*)']);
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), 1000);
}

type WhereClause = {
  sql: string;
  params: SqlValue[];
} | null;

function equalClause(column: string, value: SqlValue | undefined): WhereClause {
  return value === undefined ? null : { sql: `${column} = ?`, params: [value] };
}

function inClause(column: string, values: SqlValue[]): WhereClause {
  return values.length === 0
    ? null
    : { sql: `${column} IN (${values.map(() => '?').join(', ')})`, params: values };
}

function buildWhere(clauses: WhereClause[]): { sql: string; params: SqlValue[] } {
  const active = clauses.filter((clause): clause is NonNullable<WhereClause> => clause !== null);
  return {
    sql: active.length ? `WHERE ${active.map((clause) => clause.sql).join(' AND ')}` : '',
    params: active.flatMap((clause) => clause.params),
  };
}

function decodeSession(row: SessionRow): Session {
  const { config_json, ...session } = row;
  return {
    ...session,
    controlOwner: row.controlOwner ?? null,
    controlOwnerId: row.controlOwnerId ?? null,
    controlLabel: row.controlLabel ?? null,
    controlLeaseExpiresAt: row.controlLeaseExpiresAt ?? null,
    controlUpdatedAt: row.controlUpdatedAt ?? null,
    config: JSON.parse(config_json) as Session['config'],
  };
}

function decodeMessage(row: MessageRow): Message {
  const { metadata_json, ...message } = row;
  return {
    ...message,
    metadata: JSON.parse(metadata_json) as Record<string, unknown>,
  };
}

function decodeApproval(row: ApprovalRow): Approval {
  const { input_json, response_json, ...approval } = row;
  return {
    ...approval,
    input: JSON.parse(input_json) as unknown,
    response: response_json ? JSON.parse(response_json) as unknown : null,
  };
}

function decodePromptJob(row: PromptJobRow): PromptJob {
  return {
    ...row,
    ownerId: row.ownerId ?? null,
    controlLabel: row.controlLabel ?? null,
    error: row.error ?? null,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  };
}

function decodeEvent(row: EventRow): HubEvent {
  const { payload_json, ...event } = row;
  return {
    ...event,
    payload: JSON.parse(payload_json) as Record<string, unknown>,
  };
}

function uniqueStatuses(statuses: PromptJobStatus[] | undefined): PromptJobStatus[] {
  return [...new Set(statuses ?? [])];
}

export function sqlJson(value: unknown): SqlValue {
  return value === null || value === undefined ? null : JSON.stringify(value);
}
