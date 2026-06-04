import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
export class Store {
    dbPath;
    db;
    constructor(dbPath) {
        this.dbPath = dbPath;
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new DatabaseSync(dbPath);
        this.db.exec('PRAGMA journal_mode = WAL');
        this.db.exec('PRAGMA foreign_keys = ON');
        this.migrate();
    }
    close() {
        this.db.close();
    }
    createSession(session) {
        this.db.prepare(`
      INSERT INTO sessions (
        id, title, cwd, agent, status, codexThreadId, currentTurnId,
        controlOwner, controlOwnerId, controlLabel, controlLeaseExpiresAt, controlUpdatedAt,
        config_json, createdAt, updatedAt, lastError
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, session.title, session.cwd, session.agent, session.status, session.codexThreadId, session.currentTurnId, session.controlOwner, session.controlOwnerId, session.controlLabel, session.controlLeaseExpiresAt, session.controlUpdatedAt, JSON.stringify(session.config), session.createdAt, session.updatedAt, session.lastError);
        return session;
    }
    updateSession(session) {
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
    `).run(session.title, session.cwd, session.agent, session.status, session.codexThreadId, session.currentTurnId, session.controlOwner, session.controlOwnerId, session.controlLabel, session.controlLeaseExpiresAt, session.controlUpdatedAt, JSON.stringify(session.config), session.updatedAt, session.lastError, session.id);
        return session;
    }
    getSession(id) {
        const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
        return row ? decodeSession(row) : null;
    }
    getSessionByCodexThreadId(threadId) {
        const row = this.db.prepare('SELECT * FROM sessions WHERE codexThreadId = ?').get(threadId);
        return row ? decodeSession(row) : null;
    }
    listSessions(cwd) {
        const rows = cwd === undefined
            ? this.db.prepare('SELECT * FROM sessions ORDER BY updatedAt DESC').all()
            : this.db.prepare('SELECT * FROM sessions WHERE cwd = ? ORDER BY updatedAt DESC').all(cwd);
        return rows.map(decodeSession);
    }
    upsertCodexSession(session) {
        const codexHome = resolve(session.codexHome);
        const filePath = resolve(session.filePath);
        this.db.prepare(`
      DELETE FROM codex_sessions
      WHERE codexHome = ? AND filePath = ? AND threadId <> ?
    `).run(codexHome, filePath, session.threadId);
        this.db.prepare(`
      INSERT INTO codex_sessions (
        codexHome, threadId, cwdKey, cwd, filePath, title,
        createdAt, updatedAt, originator, threadSource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(codexHome, threadId) DO UPDATE SET
        cwdKey = excluded.cwdKey,
        cwd = excluded.cwd,
        filePath = excluded.filePath,
        title = excluded.title,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        originator = excluded.originator,
        threadSource = excluded.threadSource
    `).run(codexHome, session.threadId, session.cwdKey, session.cwd, filePath, session.title, session.createdAt, session.updatedAt, session.originator, session.threadSource);
    }
    replaceCodexSessions(codexHome, sessions) {
        const resolvedHome = resolve(codexHome);
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare('DELETE FROM codex_sessions WHERE codexHome = ?').run(resolvedHome);
            for (const session of sessions)
                this.upsertCodexSession({ ...session, codexHome: resolvedHome });
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    listCodexSessions(codexHome, cwdKey, limit) {
        const rows = this.db.prepare(`
      SELECT * FROM codex_sessions
      WHERE codexHome = ? AND cwdKey = ?
      ORDER BY updatedAt DESC, createdAt DESC, threadId ASC
      LIMIT ?
    `).all(resolve(codexHome), cwdKey, normalizeLimit(limit, 100));
        return rows.map(decodeCodexSession);
    }
    getCodexSession(codexHome, threadId) {
        const row = this.db.prepare(`
      SELECT * FROM codex_sessions
      WHERE codexHome = ? AND threadId = ?
    `).get(resolve(codexHome), threadId);
        return row ? decodeCodexSession(row) : null;
    }
    upsertCodexNativeActivity(activity) {
        this.db.prepare(`
      INSERT INTO codex_native_activities (
        threadId, nativeSessionId, cwd, transcriptPath, turnId, state,
        lastEventName, lastEventAt, lastAssistantMessage, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(threadId) DO UPDATE SET
        nativeSessionId = excluded.nativeSessionId,
        cwd = excluded.cwd,
        transcriptPath = excluded.transcriptPath,
        turnId = excluded.turnId,
        state = excluded.state,
        lastEventName = excluded.lastEventName,
        lastEventAt = excluded.lastEventAt,
        lastAssistantMessage = excluded.lastAssistantMessage,
        updatedAt = excluded.updatedAt
    `).run(activity.threadId, activity.nativeSessionId, activity.cwd, activity.transcriptPath, activity.turnId, activity.state, activity.lastEventName, activity.lastEventAt, activity.lastAssistantMessage, Date.now());
        return activity;
    }
    getCodexNativeActivity(threadId) {
        const row = this.db.prepare(`
      SELECT * FROM codex_native_activities
      WHERE threadId = ?
    `).get(threadId);
        return row ? decodeCodexNativeActivity(row) : null;
    }
    deleteCodexSessionByFilePath(codexHome, filePath) {
        const result = this.db.prepare(`
      DELETE FROM codex_sessions
      WHERE codexHome = ? AND filePath = ?
    `).run(resolve(codexHome), resolve(filePath));
        return result.changes > 0;
    }
    syncCodexSessionTitles(codexHome, index) {
        const update = this.db.prepare(`
      UPDATE codex_sessions SET
        title = CASE WHEN ? <> '' THEN ? ELSE title END,
        updatedAt = CASE WHEN ? <> '' THEN ? ELSE updatedAt END
      WHERE codexHome = ? AND threadId = ?
    `);
        const resolvedHome = resolve(codexHome);
        this.db.exec('BEGIN IMMEDIATE');
        try {
            for (const [threadId, entry] of index) {
                const title = entry.threadName.trim();
                const updatedAt = entry.updatedAt.trim();
                if (!title && !updatedAt)
                    continue;
                update.run(title, title, updatedAt, updatedAt, resolvedHome, threadId);
            }
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    createMessage(message) {
        this.db.prepare(`
      INSERT INTO messages (id, sessionId, role, kind, content, metadata_json, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(message.id, message.sessionId, message.role, message.kind, message.content, JSON.stringify(message.metadata), message.createdAt);
        return message;
    }
    listMessages(sessionId, input = 200) {
        const query = typeof input === 'number' ? { limit: input } : input;
        const limit = normalizeLimit(query.limit, 200);
        if (query.afterId) {
            const cursor = this.db.prepare('SELECT rowid FROM messages WHERE sessionId = ? AND id = ?')
                .get(sessionId, query.afterId);
            if (!cursor)
                return [];
            const rows = this.db.prepare(`
        SELECT * FROM messages
        WHERE sessionId = ? AND rowid > ?
        ORDER BY rowid ASC
        LIMIT ?
      `).all(sessionId, cursor.rowid, limit);
            return rows.map(decodeMessage);
        }
        const rows = this.db.prepare(`
      SELECT * FROM messages
      WHERE sessionId = ?
      ORDER BY rowid DESC
      LIMIT ?
    `).all(sessionId, limit);
        return rows.reverse().map(decodeMessage);
    }
    createApproval(approval) {
        this.db.prepare(`
      INSERT INTO approvals (
        id, sessionId, type, toolName, input_json, status, decision,
        response_json, createdAt, resolvedAt, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(approval.id, approval.sessionId, approval.type, approval.toolName, JSON.stringify(approval.input), approval.status, approval.decision, approval.response === null ? null : JSON.stringify(approval.response), approval.createdAt, approval.resolvedAt, approval.source);
        return approval;
    }
    updateApproval(approval) {
        this.db.prepare(`
      UPDATE approvals SET
        status = ?,
        decision = ?,
        response_json = ?,
        resolvedAt = ?,
        source = ?
      WHERE id = ?
    `).run(approval.status, approval.decision, approval.response === null ? null : JSON.stringify(approval.response), approval.resolvedAt, approval.source, approval.id);
        return approval;
    }
    getApproval(id) {
        const row = this.db.prepare('SELECT * FROM approvals WHERE id = ?').get(id);
        return row ? decodeApproval(row) : null;
    }
    listPendingApprovals(sessionId) {
        const rows = sessionId
            ? this.db.prepare('SELECT * FROM approvals WHERE status = ? AND sessionId = ? ORDER BY createdAt ASC').all('pending', sessionId)
            : this.db.prepare('SELECT * FROM approvals WHERE status = ? ORDER BY createdAt ASC').all('pending');
        return rows.map(decodeApproval);
    }
    listApprovals(query = {}) {
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
    `).all(...where.params, limit);
        return rows.map(decodeApproval);
    }
    createPromptJob(job) {
        this.db.prepare(`
      INSERT INTO prompt_jobs (
        id, sessionId, text, source, ownerId, controlLabel, status, error,
        createdAt, updatedAt, startedAt, finishedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(job.id, job.sessionId, job.text, job.source, job.ownerId, job.controlLabel, job.status, job.error, job.createdAt, job.updatedAt, job.startedAt, job.finishedAt);
        return job;
    }
    updatePromptJob(job) {
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
    `).run(job.text, job.source, job.ownerId, job.controlLabel, job.status, job.error, job.updatedAt, job.startedAt, job.finishedAt, job.id);
        return job;
    }
    getPromptJob(id) {
        const row = this.db.prepare('SELECT * FROM prompt_jobs WHERE id = ?').get(id);
        return row ? decodePromptJob(row) : null;
    }
    listPromptJobs(query = {}) {
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
    `).all(...where.params, limit);
        return rows.map(decodePromptJob);
    }
    getNextQueuedPromptJob(sessionId) {
        const row = this.db.prepare(`
      SELECT * FROM prompt_jobs
      WHERE sessionId = ? AND status = 'queued'
      ORDER BY createdAt ASC, rowid ASC
      LIMIT 1
    `).get(sessionId);
        return row ? decodePromptJob(row) : null;
    }
    getRunningPromptJob(sessionId) {
        const row = this.db.prepare(`
      SELECT * FROM prompt_jobs
      WHERE sessionId = ? AND status = 'running'
      ORDER BY startedAt ASC, rowid ASC
      LIMIT 1
    `).get(sessionId);
        return row ? decodePromptJob(row) : null;
    }
    updatePromptJobStatus(id, status, patch = {}) {
        const current = this.getPromptJob(id);
        if (!current)
            return null;
        return this.updatePromptJob({
            ...current,
            status,
            error: patch.error === undefined ? current.error : patch.error,
            startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt,
            finishedAt: patch.finishedAt === undefined ? current.finishedAt : patch.finishedAt,
            updatedAt: Date.now(),
        });
    }
    cancelPromptJobs(sessionId, statuses, error) {
        const targets = uniqueStatuses(statuses);
        if (targets.length === 0)
            return 0;
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
    failRunningPromptJobs(error) {
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
    listSessionsWithQueuedPromptJobs() {
        const rows = this.db.prepare(`
      SELECT DISTINCT sessionId FROM prompt_jobs
      WHERE status = 'queued'
      ORDER BY sessionId ASC
    `).all();
        return rows.map((row) => row.sessionId);
    }
    updateSessionTitle(id, title) {
        const current = this.getSession(id);
        if (!current)
            return null;
        const next = {
            ...current,
            title,
            updatedAt: Date.now(),
        };
        return this.updateSession(next);
    }
    deleteSession(id) {
        const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
        return result.changes > 0;
    }
    updateSessionControl(id, input) {
        const current = this.getSession(id);
        if (!current)
            return null;
        const next = {
            ...current,
            ...input,
            updatedAt: Date.now(),
        };
        return this.updateSession(next);
    }
    upsertBinding(binding) {
        this.db.prepare(`
      INSERT INTO bindings (id, controlType, externalId, sessionId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(controlType, externalId) DO UPDATE SET
        sessionId = excluded.sessionId,
        updatedAt = excluded.updatedAt
    `).run(binding.id, binding.controlType, binding.externalId, binding.sessionId, binding.createdAt, binding.updatedAt);
        return binding;
    }
    getBinding(controlType, externalId) {
        return this.db.prepare('SELECT * FROM bindings WHERE controlType = ? AND externalId = ?')
            .get(controlType, externalId) ?? null;
    }
    listBindings(controlType) {
        return controlType
            ? this.db.prepare('SELECT * FROM bindings WHERE controlType = ? ORDER BY updatedAt DESC').all(controlType)
            : this.db.prepare('SELECT * FROM bindings ORDER BY updatedAt DESC').all();
    }
    addEvent(event) {
        const result = this.db.prepare(`
      INSERT INTO events (type, sessionId, payload_json, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(event.type, event.sessionId, JSON.stringify(event.payload), event.createdAt);
        return { ...event, id: Number(result.lastInsertRowid) };
    }
    listEvents(afterId = 0, sessionId) {
        const rows = sessionId
            ? this.db.prepare('SELECT * FROM events WHERE id > ? AND sessionId = ? ORDER BY id ASC').all(afterId, sessionId)
            : this.db.prepare('SELECT * FROM events WHERE id > ? ORDER BY id ASC').all(afterId);
        return rows.map(decodeEvent);
    }
    latestEventId(sessionId) {
        const row = sessionId
            ? this.db.prepare('SELECT id FROM events WHERE sessionId = ? ORDER BY id DESC LIMIT 1').get(sessionId)
            : this.db.prepare('SELECT id FROM events ORDER BY id DESC LIMIT 1').get();
        return row ? Number(row.id) : 0;
    }
    countPromptJobs(statuses, sessionId) {
        const targets = uniqueStatuses(statuses);
        if (targets.length === 0)
            return 0;
        const where = buildWhere([
            inClause('status', targets),
            equalClause('sessionId', sessionId),
        ]);
        const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM prompt_jobs
      ${where.sql}
    `).get(...where.params);
        return Number(row.count);
    }
    stats() {
        return {
            sessions: scalar(this.db, 'SELECT COUNT(*) FROM sessions'),
            messages: scalar(this.db, 'SELECT COUNT(*) FROM messages'),
            pendingApprovals: scalar(this.db, "SELECT COUNT(*) FROM approvals WHERE status = 'pending'"),
            queuedPrompts: this.countPromptJobs(['queued']),
        };
    }
    migrate() {
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

      CREATE INDEX IF NOT EXISTS idx_sessions_updated
        ON sessions(updatedAt DESC);

      CREATE INDEX IF NOT EXISTS idx_sessions_cwd_updated
        ON sessions(cwd, updatedAt DESC);

      CREATE TABLE IF NOT EXISTS codex_sessions (
        codexHome TEXT NOT NULL,
        threadId TEXT NOT NULL,
        cwdKey TEXT NOT NULL,
        cwd TEXT NOT NULL,
        filePath TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        originator TEXT NOT NULL,
        threadSource TEXT NOT NULL,
        PRIMARY KEY(codexHome, threadId)
      );

      CREATE INDEX IF NOT EXISTS idx_codex_sessions_home_cwd_updated
        ON codex_sessions(codexHome, cwdKey, updatedAt DESC, createdAt DESC);

      CREATE INDEX IF NOT EXISTS idx_codex_sessions_home_file
        ON codex_sessions(codexHome, filePath);

      CREATE TABLE IF NOT EXISTS codex_native_activities (
        threadId TEXT PRIMARY KEY,
        nativeSessionId TEXT NOT NULL,
        cwd TEXT,
        transcriptPath TEXT,
        turnId TEXT,
        state TEXT NOT NULL,
        lastEventName TEXT NOT NULL,
        lastEventAt INTEGER NOT NULL,
        lastAssistantMessage TEXT,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_codex_native_activities_updated
        ON codex_native_activities(updatedAt DESC);

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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_codex_thread_id
        ON sessions(codexThreadId)
        WHERE codexThreadId IS NOT NULL;
    `);
        this.ensureSessionControlColumns();
    }
    ensureSessionControlColumns() {
        const columns = new Set(this.db.prepare('PRAGMA table_info(sessions)').all().map((column) => column.name));
        const additions = [
            ['controlOwner', 'TEXT'],
            ['controlOwnerId', 'TEXT'],
            ['controlLabel', 'TEXT'],
            ['controlLeaseExpiresAt', 'INTEGER'],
            ['controlUpdatedAt', 'INTEGER'],
        ];
        for (const [name, type] of additions) {
            if (!columns.has(name))
                this.db.exec(`ALTER TABLE sessions ADD COLUMN ${name} ${type}`);
        }
    }
}
function scalar(db, sql) {
    const row = db.prepare(sql).get();
    return Number(row['COUNT(*)']);
}
function normalizeLimit(value, fallback) {
    if (value === undefined)
        return fallback;
    if (!Number.isFinite(value))
        return fallback;
    return Math.min(Math.max(Math.trunc(value), 1), 1000);
}
function equalClause(column, value) {
    return value === undefined ? null : { sql: `${column} = ?`, params: [value] };
}
function inClause(column, values) {
    return values.length === 0
        ? null
        : { sql: `${column} IN (${values.map(() => '?').join(', ')})`, params: values };
}
function buildWhere(clauses) {
    const active = clauses.filter((clause) => clause !== null);
    return {
        sql: active.length ? `WHERE ${active.map((clause) => clause.sql).join(' AND ')}` : '',
        params: active.flatMap((clause) => clause.params),
    };
}
function decodeSession(row) {
    const { config_json, ...session } = row;
    return {
        ...session,
        controlOwner: row.controlOwner ?? null,
        controlOwnerId: row.controlOwnerId ?? null,
        controlLabel: row.controlLabel ?? null,
        controlLeaseExpiresAt: row.controlLeaseExpiresAt ?? null,
        controlUpdatedAt: row.controlUpdatedAt ?? null,
        config: JSON.parse(config_json),
    };
}
function decodeCodexSession(row) {
    return {
        ...row,
        id: row.threadId,
    };
}
function decodeCodexNativeActivity(row) {
    const { updatedAt: _, ...activity } = row;
    return {
        ...activity,
        cwd: activity.cwd ?? null,
        transcriptPath: activity.transcriptPath ?? null,
        turnId: activity.turnId ?? null,
        lastAssistantMessage: activity.lastAssistantMessage ?? null,
    };
}
function decodeMessage(row) {
    const { metadata_json, ...message } = row;
    return {
        ...message,
        metadata: JSON.parse(metadata_json),
    };
}
function decodeApproval(row) {
    const { input_json, response_json, ...approval } = row;
    return {
        ...approval,
        input: JSON.parse(input_json),
        response: response_json ? JSON.parse(response_json) : null,
    };
}
function decodePromptJob(row) {
    return {
        ...row,
        ownerId: row.ownerId ?? null,
        controlLabel: row.controlLabel ?? null,
        error: row.error ?? null,
        startedAt: row.startedAt ?? null,
        finishedAt: row.finishedAt ?? null,
    };
}
function decodeEvent(row) {
    const { payload_json, ...event } = row;
    return {
        ...event,
        payload: JSON.parse(payload_json),
    };
}
function uniqueStatuses(statuses) {
    return [...new Set(statuses ?? [])];
}
export function sqlJson(value) {
    return value === null || value === undefined ? null : JSON.stringify(value);
}
