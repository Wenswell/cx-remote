import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Approval, ControlBinding, HubEvent, Message, Session } from '../domain/types.js';

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
    const clauses: string[] = [];
    const params: SqlValue[] = [];
    if (query.sessionId) {
      clauses.push('sessionId = ?');
      params.push(query.sessionId);
    }
    if (query.status) {
      clauses.push('status = ?');
      params.push(query.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db.prepare(`
      SELECT * FROM approvals
      ${where}
      ORDER BY createdAt DESC
      LIMIT ?
    `).all(...params, limit) as ApprovalRow[];
    return rows.map(decodeApproval);
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

  stats(): { sessions: number; messages: number; pendingApprovals: number } {
    return {
      sessions: scalar(this.db, 'SELECT COUNT(*) FROM sessions'),
      messages: scalar(this.db, 'SELECT COUNT(*) FROM messages'),
      pendingApprovals: scalar(this.db, "SELECT COUNT(*) FROM approvals WHERE status = 'pending'"),
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

function decodeSession(row: SessionRow): Session {
  return {
    ...row,
    controlOwner: row.controlOwner ?? null,
    controlOwnerId: row.controlOwnerId ?? null,
    controlLabel: row.controlLabel ?? null,
    controlLeaseExpiresAt: row.controlLeaseExpiresAt ?? null,
    controlUpdatedAt: row.controlUpdatedAt ?? null,
    config: JSON.parse(row.config_json) as Session['config'],
  };
}

function decodeMessage(row: MessageRow): Message {
  return {
    ...row,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
  };
}

function decodeApproval(row: ApprovalRow): Approval {
  return {
    ...row,
    input: JSON.parse(row.input_json) as unknown,
    response: row.response_json ? JSON.parse(row.response_json) as unknown : null,
  };
}

function decodeEvent(row: EventRow): HubEvent {
  return {
    ...row,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  };
}

export function sqlJson(value: unknown): SqlValue {
  return value === null || value === undefined ? null : JSON.stringify(value);
}
