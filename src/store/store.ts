import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Approval, ControlBinding, HubEvent, Message, Session } from '../domain/types.js';

type SqlValue = string | number | null;

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
        config_json, createdAt, updatedAt, lastError
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.title,
      session.cwd,
      session.agent,
      session.status,
      session.codexThreadId,
      session.currentTurnId,
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

  listMessages(sessionId: string, limit = 200): Message[] {
    const rows = this.db.prepare(`
      SELECT * FROM messages
      WHERE sessionId = ?
      ORDER BY createdAt DESC
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
  }
}

function scalar(db: DatabaseSync, sql: string): number {
  const row = db.prepare(sql).get() as { 'COUNT(*)': number };
  return Number(row['COUNT(*)']);
}

function decodeSession(row: SessionRow): Session {
  return {
    ...row,
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
