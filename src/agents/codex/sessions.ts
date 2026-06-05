import { closeSync, existsSync, openSync, readFileSync, readdirSync, readSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import type { CodexNativeActivity, CodexNativeActivityState } from '../../domain/types.js';

export interface CodexResumeSession {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  originator: string;
  threadSource: string;
}

export interface CodexTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface CodexSessionTranscript {
  session: CodexResumeSession;
  messages: CodexTranscriptMessage[];
}

export interface CodexSessionPreview extends CodexResumeSession {
  messageCount: number;
  messages: CodexTranscriptMessage[];
}

export interface CodexSessionRecord extends CodexResumeSession {
  codexHome: string;
  cwdKey: string;
  filePath: string;
  threadId: string;
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
const DEFAULT_PREVIEW_MESSAGE_LIMIT = 6;
const MAX_PREVIEW_MESSAGE_CHARS = 1200;

export function defaultCodexHome(): string {
  return resolve(process.env.CODEX_HOME || join(homedir(), '.codex'));
}

export function resolveCodexCwdKey(cwd: string): string {
  return realpathSync(resolve(cwd));
}

export function loadCodexSessionIndex(codexHome: string): Map<string, SessionIndexEntry> {
  return readSessionIndex(join(resolve(codexHome), 'session_index.jsonl'));
}

export function listCodexSessionFiles(codexHome: string): string[] {
  return listCodexSessionFilesUnder(join(resolve(codexHome), 'sessions'));
}

export function listCodexSessionFilesUnder(root: string): string[] {
  const resolvedRoot = resolve(root);
  return existsSync(resolvedRoot) ? [...listJsonlFiles(resolvedRoot)] : [];
}

export function readCodexSessionRecord(filePath: string, index: Map<string, SessionIndexEntry>, codexHome = defaultCodexHome()): CodexSessionRecord | null {
  const session = readSessionMeta(filePath, index);
  if (!session) return null;
  if (session.threadSource !== 'user') return null;
  const cwdKey = codexCwdKeyOrNull(session.cwd);
  if (!cwdKey) return null;
  const resolvedFilePath = resolve(filePath);
  return {
    ...session,
    codexHome: resolve(codexHome),
    cwdKey,
    filePath: resolvedFilePath,
    threadId: session.id,
  };
}

export function scanCodexSessionRecords(codexHome: string): CodexSessionRecord[] {
  const resolvedHome = resolve(codexHome);
  const index = loadCodexSessionIndex(resolvedHome);
  return listCodexSessionFiles(resolvedHome)
    .map((filePath) => readCodexSessionRecord(filePath, index, resolvedHome))
    .filter((session): session is CodexSessionRecord => session !== null);
}

export function listCodexResumeSessions(options: ListCodexResumeSessionsOptions): CodexResumeSession[] {
  const codexHome = resolve(options.codexHome || defaultCodexHome());
  const targetCwd = resolveCodexCwdKey(options.cwd);
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  return scanCodexSessionRecords(codexHome)
    .filter((session) => session.cwdKey === targetCwd)
    .map(stripCodexSessionRecord)
    .sort((left, right) => sessionTime(right).localeCompare(sessionTime(left)))
    .slice(0, limit);
}

export function readCodexSessionTranscript(options: { threadId: string; codexHome?: string }): CodexSessionTranscript | null {
  const codexHome = resolve(options.codexHome || defaultCodexHome());
  const index = loadCodexSessionIndex(codexHome);
  const filePath = findSessionFilePath(join(codexHome, 'sessions'), options.threadId.trim());
  if (!filePath) return null;
  return readCodexSessionTranscriptFromFile(filePath, index, codexHome);
}

export function readCodexSessionNativeActivitySnapshot(options: {
  threadId: string;
  codexHome?: string;
  now?: number;
}): CodexNativeActivity | null {
  const codexHome = resolve(options.codexHome || defaultCodexHome());
  const index = loadCodexSessionIndex(codexHome);
  const threadId = options.threadId.trim();
  const filePath = findSessionFilePath(join(codexHome, 'sessions'), threadId);
  if (!filePath) return null;
  const session = readSessionMeta(filePath, index);
  if (!session) return null;
  const snapshot = readTranscriptActivitySnapshot(filePath, options.now ?? Date.now());
  return {
    nativeSessionId: threadId,
    threadId,
    cwd: session.cwd,
    transcriptPath: resolve(filePath),
    turnId: snapshot.turnId,
    state: snapshot.state,
    lastEventName: snapshot.lastEventName,
    lastEventAt: snapshot.lastEventAt,
    lastAssistantMessage: snapshot.lastAssistantMessage,
  };
}

export function readCodexSessionPreview(options: {
  threadId: string;
  codexHome?: string;
  messageLimit?: number;
}): CodexSessionPreview | null {
  const transcript = readCodexSessionTranscript(options);
  if (!transcript) return null;
  return buildPreview(transcript, options.messageLimit ?? DEFAULT_PREVIEW_MESSAGE_LIMIT);
}

export function readCodexSessionTranscriptFromFile(
  filePath: string,
  indexOrCodexHome?: Map<string, SessionIndexEntry> | string,
  codexHome = defaultCodexHome(),
): CodexSessionTranscript | null {
  const index = indexOrCodexHome instanceof Map ? indexOrCodexHome : loadCodexSessionIndex(indexOrCodexHome || codexHome);
  const session = readSessionMeta(filePath, index);
  if (!session) return null;
  return {
    session,
    messages: readTranscriptMessages(filePath),
  };
}

export function readCodexSessionMetaFromFile(
  filePath: string,
  indexOrCodexHome?: Map<string, SessionIndexEntry> | string,
  codexHome = defaultCodexHome(),
): CodexResumeSession | null {
  const index = indexOrCodexHome instanceof Map ? indexOrCodexHome : loadCodexSessionIndex(indexOrCodexHome || codexHome);
  return readSessionMeta(filePath, index);
}

export function readCodexSessionPreviewFromFile(
  filePath: string,
  indexOrCodexHome?: Map<string, SessionIndexEntry> | string,
  codexHome = defaultCodexHome(),
  messageLimit = DEFAULT_PREVIEW_MESSAGE_LIMIT,
): CodexSessionPreview | null {
  const transcript = readCodexSessionTranscriptFromFile(filePath, indexOrCodexHome, codexHome);
  if (!transcript) return null;
  return buildPreview(transcript, messageLimit);
}

export function readCodexTranscript(options: { threadId: string; codexHome?: string }): CodexTranscriptMessage[] {
  return readCodexSessionTranscript(options)?.messages ?? [];
}

function readTranscriptMessages(filePath: string): CodexTranscriptMessage[] {
  const messages: CodexTranscriptMessage[] = [];
  readJsonlLines(filePath, (line) => {
    const message = transcriptMessageFromLine(line);
    if (!message) return;
    messages.push(message);
  });
  return messages;
}

function readTranscriptActivitySnapshot(filePath: string, now: number): Pick<
  CodexNativeActivity,
  'turnId' | 'state' | 'lastEventName' | 'lastEventAt' | 'lastAssistantMessage'
> {
  let state: CodexNativeActivityState = 'idle';
  let turnId: string | null = null;
  let lastEventName = 'session_meta';
  let lastEventAt = now;
  let lastAssistantMessage: string | null = null;

  readJsonlLines(filePath, (line) => {
    const record = parseJsonObject(line);
    if (!record) return;
    const payload = objectValue(record.payload);
    if (!payload) return;
    const eventAt = timestampMs(stringValue(record.timestamp)) || now;

    if (record.type === 'event_msg') {
      const type = stringValue(payload.type);
      if (type === 'task_started') {
        state = 'working';
        turnId = stringValue(payload.turn_id) || turnId;
        lastEventName = type;
        lastEventAt = eventAt;
        return;
      }
      if (type === 'task_complete') {
        state = 'idle';
        turnId = null;
        lastAssistantMessage = stringValue(payload.last_agent_message) || lastAssistantMessage;
        lastEventName = type;
        lastEventAt = eventAt;
        return;
      }
      if (type === 'turn_aborted') {
        state = 'idle';
        turnId = null;
        lastEventName = type;
        lastEventAt = eventAt;
        return;
      }
      if (type === 'task_failed') {
        state = 'error';
        turnId = null;
        lastAssistantMessage = stringValue(payload.last_agent_message) || stringValue(payload.error) || lastAssistantMessage;
        lastEventName = type;
        lastEventAt = eventAt;
        return;
      }
      return;
    }

    if (record.type === 'turn_context') {
      turnId = stringValue(payload.turn_id) || turnId;
      if (state !== 'idle') {
        lastEventName = 'turn_context';
        lastEventAt = eventAt;
      }
      return;
    }

    if (record.type !== 'response_item') return;
    const type = stringValue(payload.type);
    if (type === 'message' && payload.role === 'assistant') {
      const content = normalizeMessageContent(responseItemText(payload.content));
      if (content && payload.phase === 'final_answer') lastAssistantMessage = content;
      return;
    }
    if ((type === 'function_call' || type === 'function_call_output' || type === 'reasoning') && state !== 'idle') {
      lastEventName = type;
      lastEventAt = eventAt;
    }
  });

  const activityState = state as CodexNativeActivityState;
  return {
    turnId,
    state: activityState,
    lastEventName,
    lastEventAt: isLeaseBackedActivityState(activityState) ? now : lastEventAt,
    lastAssistantMessage,
  };
}

function isLeaseBackedActivityState(state: CodexNativeActivityState): boolean {
  return state === 'ready' || state === 'working' || state === 'waiting_approval';
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

function findSessionFilePath(sessionsDir: string, threadId: string): string | null {
  if (!existsSync(sessionsDir)) return null;
  for (const filePath of listJsonlFiles(sessionsDir)) {
    const line = readFirstLine(filePath);
    if (!line) continue;
    const record = parseJsonObject(line);
    if (!record || record.type !== 'session_meta') continue;
    const payload = objectValue(record.payload);
    if (stringValue(payload?.id) === threadId) return filePath;
  }
  return null;
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

function readJsonlLines(filePath: string, onLine: (line: string) => void): void {
  let fd: number | null = null;
  try {
    fd = openSync(filePath, 'r');
    const buffer = Buffer.alloc(FIRST_LINE_CHUNK_SIZE);
    const decoder = new StringDecoder('utf8');
    let pending = '';

    for (;;) {
      const bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      pending += decoder.write(buffer.subarray(0, bytesRead));

      for (;;) {
        const newlineIndex = pending.indexOf('\n');
        if (newlineIndex < 0) break;
        const line = pending.slice(0, newlineIndex);
        pending = pending.slice(newlineIndex + 1);
        if (line.trim()) onLine(line);
      }
    }

    pending += decoder.end();
    if (pending.trim()) onLine(pending);
  } catch {
    return;
  } finally {
    if (fd !== null) closeSync(fd);
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

function stripCodexSessionRecord(session: CodexSessionRecord): CodexResumeSession {
  const { codexHome: _codexHome, cwdKey: _cwdKey, filePath: _filePath, threadId: _threadId, ...rest } = session;
  return rest;
}

function codexCwdKeyOrNull(cwd: string): string | null {
  try {
    return resolveCodexCwdKey(cwd);
  } catch {
    return null;
  }
}

function buildPreview(transcript: CodexSessionTranscript, messageLimit: number): CodexSessionPreview {
  const limit = Math.max(Math.trunc(messageLimit), 0);
  return {
    ...transcript.session,
    messageCount: transcript.messages.length,
    messages: transcript.messages.slice(0, limit).map((message) => ({
      ...message,
      content: truncatePreviewContent(message.content),
    })),
  };
}

function transcriptMessageFromLine(line: string): CodexTranscriptMessage | null {
  const record = parseJsonObject(line);
  if (!record || record.type !== 'response_item') return null;
  const payload = objectValue(record.payload);
  if (!payload || payload.type !== 'message') return null;
  const role = stringValue(payload.role);
  if (role !== 'user' && role !== 'assistant') return null;
  const content = normalizeMessageContent(responseItemText(payload.content));
  if (!content) return null;
  return {
    role,
    content,
    createdAt: timestampMs(stringValue(record.timestamp)) || Date.now(),
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
  if (!title || isInjectedPromptText(title)) return '';
  return title;
}

function normalizeMessageContent(value: string): string {
  const content = value.trim();
  return content && !isInjectedPromptText(content) ? content : '';
}

function isInjectedPromptText(value: string): boolean {
  return value.startsWith('# AGENTS.md instructions') || value.includes('<INSTRUCTIONS>');
}

function timestampMs(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function truncatePreviewContent(value: string): string {
  return value.length > MAX_PREVIEW_MESSAGE_CHARS
    ? `${value.slice(0, MAX_PREVIEW_MESSAGE_CHARS - 1)}...`
    : value;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
