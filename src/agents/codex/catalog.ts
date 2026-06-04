import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { Store } from '../../store/store.js';
import {
  defaultCodexHome,
  listCodexSessionFiles,
  listCodexSessionFilesUnder,
  loadCodexSessionIndex,
  readCodexSessionPreviewFromFile,
  readCodexSessionRecord,
  resolveCodexCwdKey,
  scanCodexSessionRecords,
  type CodexSessionPreview,
  type CodexSessionRecord,
} from './sessions.js';

const WATCH_DEBOUNCE_MS = 150;

export class CodexSessionCatalog {
  private readonly codexHome: string;
  private readonly sessionsDir: string;
  private readonly indexPath: string;
  private watcher: FSWatcher | null = null;
  private readyPromise: Promise<void> | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private pendingIndexRefresh = false;
  private pendingSessionPaths = new Set<string>();
  private pendingSessionDirs = new Set<string>();
  private started = false;

  constructor(
    private readonly store: Store,
    codexHome = defaultCodexHome(),
  ) {
    this.codexHome = resolve(codexHome);
    this.sessionsDir = join(this.codexHome, 'sessions');
    this.indexPath = join(this.codexHome, 'session_index.jsonl');
  }

  async ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = this.initialize().catch((error) => {
      this.readyPromise = null;
      throw error;
    });
    return this.readyPromise;
  }

  async stop(): Promise<void> {
    this.started = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushPending();
    this.pendingIndexRefresh = false;
    this.pendingSessionPaths.clear();
    this.pendingSessionDirs.clear();
    const watcher = this.watcher;
    this.watcher = null;
    this.readyPromise = null;
    if (watcher) await watcher.close();
  }

  async listResumeSessions(options: { cwd: string; limit?: number }): Promise<CodexSessionRecord[]> {
    await this.ensureReady();
    const sessions = this.store.listCodexSessions(this.codexHome, resolveCodexCwdKey(options.cwd), options.limit);
    return sessions.filter((session) => {
      if (existsSync(session.filePath)) return true;
      this.store.deleteCodexSessionByFilePath(this.codexHome, session.filePath);
      return false;
    });
  }

  async readSessionPreview(options: { threadId: string; messageLimit?: number }): Promise<CodexSessionPreview | null> {
    await this.ensureReady();
    const session = this.store.getCodexSession(this.codexHome, options.threadId.trim());
    if (!session) return null;
    if (!existsSync(session.filePath)) {
      this.store.deleteCodexSessionByFilePath(this.codexHome, session.filePath);
      return null;
    }
    return readCodexSessionPreviewFromFile(session.filePath, this.codexHome, this.codexHome, options.messageLimit);
  }

  private async initialize(): Promise<void> {
    mkdirSync(this.sessionsDir, { recursive: true });
    this.rebuildIndex();
    this.started = true;
    this.watcher = chokidar.watch(this.codexHome, {
      ignoreInitial: true,
      ignored: (path) => this.isIgnoredWatchPath(path),
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
      ignorePermissionErrors: true,
    });
    this.watcher
      .on('add', (path) => this.queueChange(path))
      .on('addDir', (path) => this.queueDirectory(path))
      .on('change', (path) => this.queueChange(path))
      .on('unlink', (path) => this.queueChange(path));
    await new Promise<void>((resolveReady, rejectReady) => {
      this.watcher?.once('ready', resolveReady);
      this.watcher?.once('error', rejectReady);
    });
  }

  private queueChange(path: string): void {
    if (!this.started) return;
    const resolved = resolve(path);
    if (resolved === this.indexPath) {
      this.pendingIndexRefresh = true;
      this.scheduleFlush();
      return;
    }
    if (!resolved.startsWith(`${this.sessionsDir}/`)) return;
    if (!existsSync(resolved)) {
      this.pendingSessionPaths.add(resolved);
      this.scheduleFlush();
      return;
    }
    this.pendingSessionPaths.add(resolved);
    this.scheduleFlush();
  }

  private queueDirectory(path: string): void {
    if (!this.started) return;
    const resolved = resolve(path);
    if (!resolved.startsWith(`${this.sessionsDir}/`)) return;
    this.pendingSessionDirs.add(resolved);
    this.scheduleFlush();
  }

  private isIgnoredWatchPath(path: string): boolean {
    const resolved = resolve(path);
    return resolved !== this.codexHome
      && resolved !== this.indexPath
      && resolved !== this.sessionsDir
      && !resolved.startsWith(`${this.sessionsDir}/`);
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushPending();
    }, WATCH_DEBOUNCE_MS);
  }

  private async flushPending(): Promise<void> {
    const indexDirty = this.pendingIndexRefresh;
    const sessionPaths = new Set(this.pendingSessionPaths);
    const sessionDirs = [...this.pendingSessionDirs];
    if (!indexDirty && sessionPaths.size === 0 && sessionDirs.length === 0) return;

    this.pendingIndexRefresh = false;
    this.pendingSessionPaths.clear();
    this.pendingSessionDirs.clear();

    for (const dir of sessionDirs) {
      if (!existsSync(dir)) continue;
      for (const filePath of listCodexSessionFilesUnder(dir)) sessionPaths.add(filePath);
    }

    const index = loadCodexSessionIndex(this.codexHome);
    if (indexDirty) {
      this.store.syncCodexSessionTitles(this.codexHome, index);
    }

    for (const filePath of sessionPaths) {
      if (!existsSync(filePath)) {
        this.store.deleteCodexSessionByFilePath(this.codexHome, filePath);
        continue;
      }
      const record = readCodexSessionRecord(filePath, index, this.codexHome);
      if (record) {
        this.store.upsertCodexSession(record);
      } else {
        this.store.deleteCodexSessionByFilePath(this.codexHome, filePath);
      }
    }
  }

  private rebuildIndex(): void {
    this.store.replaceCodexSessions(this.codexHome, scanCodexSessionRecords(this.codexHome));
  }
}
