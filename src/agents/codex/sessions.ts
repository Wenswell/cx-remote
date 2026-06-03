import { closeSync, existsSync, openSync, readFileSync, readdirSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';

export interface CodexResumeSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  originator: string;
  threadSource: string;
}

export interface ListCodexResumeSessionsOptions {
  cwd: string;
  codexHome?: string;
  limit?: number;
}

type SessionIndexEntry = {
  threadName: string;
  updatedAt: string;
};

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const FIRST_LINE_CHUNK_SIZE = 64 * 1024;
const MAX_FIRST_LINE_BYTES = 5 * 1024 * 1024;
const MAX_TITLE_SCAN_BYTES = 5 * 1024 * 1024;
const MAX_TITLE_SCAN_LINES = 200;

export function defaultCodexHome(): string {
  return resolve(process.env.CODEX_HOME || join(homedir(), '.codex'));
}

export function listCodexResumeSessions(options: ListCodexResumeSessionsOptions): CodexResumeSession[] {
  const codexHome = resolve(options.codexHome || defaultCodexHome());
  const sessionsDir = join(codexHome, 'sessions');
  const targetCwd = resolve(options.cwd);
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  if (!existsSync(sessionsDir)) return [];

  const index = readSessionIndex(join(codexHome, 'session_index.jsonl'));
  const sessions: CodexResumeSession[] = [];
  for (const filePath of listJsonlFiles(sessionsDir)) {
    const session = readSessionMeta(filePath, index);
    if (session && resolve(session.cwd) === targetCwd) sessions.push(session);
  }

  return sessions
    .sort((left, right) => sessionTime(right).localeCompare(sessionTime(left)))
    .slice(0, limit);
}

function readSessionIndex(filePath: string): Map<string, SessionIndexEntry> {
  const index = new Map<string, SessionIndexEntry>();
  if (!existsSync(filePath)) return index;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const record = parseJsonObject(line);
    if (!record) continue;
    const id = stringValue(record.id);
    if (!id) continue;
    index.set(id, {
      threadName: stringValue(record.thread_name) || '',
      updatedAt: stringValue(record.updated_at) || '',
    });
  }
  return index;
}

function* listJsonlFiles(root: string): Generator<string> {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) {
      yield* listJsonlFiles(filePath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.jsonl')) yield filePath;
  }
}

function readSessionMeta(filePath: string, index: Map<string, SessionIndexEntry>): CodexResumeSession | null {
  const line = readFirstLine(filePath);
  if (!line) return null;
  const record = parseJsonObject(line);
  if (!record || record.type !== 'session_meta') return null;
  const payload = objectValue(record.payload);
  if (!payload) return null;

  const id = stringValue(payload.id);
  const cwd = stringValue(payload.cwd);
  if (!id || !cwd) return null;

  const indexed = index.get(id);
  const createdAt = stringValue(payload.timestamp) || stringValue(record.timestamp) || statSync(filePath).mtime.toISOString();
  const updatedAt = indexed?.updatedAt || createdAt;
  return {
    id,
    title: indexed?.threadName || readTranscriptTitle(filePath) || basename(cwd) || id,
    cwd,
    createdAt,
    updatedAt,
    originator: stringValue(payload.originator) || '',
    threadSource: stringValue(payload.thread_source) || '',
  };
}

function readFirstLine(filePath: string): string | null {
  let fd: number | null = null;
  try {
    fd = openSync(filePath, 'r');
    const chunks: Buffer[] = [];
    const buffer = Buffer.alloc(FIRST_LINE_CHUNK_SIZE);
    let totalBytes = 0;

    for (;;) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      const slice = buffer.subarray(0, bytesRead);
      const newlineIndex = slice.indexOf(10);
      if (newlineIndex >= 0) {
        chunks.push(Buffer.from(slice.subarray(0, newlineIndex)));
        return Buffer.concat(chunks).toString('utf8');
      }

      totalBytes += bytesRead;
      if (totalBytes > MAX_FIRST_LINE_BYTES) return null;
      chunks.push(Buffer.from(slice));
    }

    return chunks.length ? Buffer.concat(chunks).toString('utf8') : null;
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function readTranscriptTitle(filePath: string): string {
  let fd: number | null = null;
  try {
    fd = openSync(filePath, 'r');
    const buffer = Buffer.alloc(FIRST_LINE_CHUNK_SIZE);
    const decoder = new StringDecoder('utf8');
    let pending = '';
    let totalBytes = 0;
    let scannedLines = 0;

    while (totalBytes <= MAX_TITLE_SCAN_BYTES && scannedLines < MAX_TITLE_SCAN_LINES) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
      pending += decoder.write(buffer.subarray(0, bytesRead));

      for (;;) {
        const newlineIndex = pending.indexOf('\n');
        if (newlineIndex < 0) break;
        const line = pending.slice(0, newlineIndex);
        pending = pending.slice(newlineIndex + 1);
        scannedLines += 1;

        const title = extractTitleFromTranscriptLine(line);
        if (title) return title;
        if (scannedLines >= MAX_TITLE_SCAN_LINES) return '';
      }
    }
    pending += decoder.end();
    if (pending && scannedLines < MAX_TITLE_SCAN_LINES) return extractTitleFromTranscriptLine(pending);
    return '';
  } catch {
    return '';
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function extractTitleFromTranscriptLine(line: string): string {
  const record = parseJsonObject(line);
  if (!record) return '';
  const payload = objectValue(record.payload);
  if (!payload) return '';

  if (record.type === 'event_msg' && payload.type === 'user_message') {
    return normalizeTitle(stringValue(payload.message));
  }

  if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
    return normalizeTitle(responseItemText(payload.content));
  }

  return '';
}

function sessionTime(session: CodexResumeSession): string {
  return session.updatedAt || session.createdAt || '';
}

function parseJsonObject(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return objectValue(parsed);
  } catch {
    return null;
  }
}

function responseItemText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((item) => {
    const record = objectValue(item);
    return record ? stringValue(record.text) : '';
  }).filter(Boolean).join(' ');
}

function normalizeTitle(value: string): string {
  const title = value.replace(/\s+/g, ' ').trim();
  if (!title || title.startsWith('# AGENTS.md instructions') || title.includes('<INSTRUCTIONS>')) return '';
  return title;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
