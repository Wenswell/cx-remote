import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import chokidar from 'chokidar';
import { defaultCodexHome, listCodexSessionFilesUnder, loadCodexSessionIndex, readCodexSessionPreviewFromFile, readCodexSessionRecord, resolveCodexCwdKey, scanCodexSessionRecords, } from './sessions.js';
const WATCH_DEBOUNCE_MS = 150;
export class CodexSessionCatalog {
    store;
    codexHome;
    sessionsDir;
    indexPath;
    watcher = null;
    readyPromise = null;
    flushTimer = null;
    pendingIndexRefresh = false;
    pendingSessionPaths = new Set();
    pendingSessionDirs = new Set();
    started = false;
    constructor(store, codexHome = defaultCodexHome()) {
        this.store = store;
        this.codexHome = resolve(codexHome);
        this.sessionsDir = join(this.codexHome, 'sessions');
        this.indexPath = join(this.codexHome, 'session_index.jsonl');
    }
    async ensureReady() {
        if (this.readyPromise)
            return this.readyPromise;
        this.readyPromise = this.initialize().catch((error) => {
            this.readyPromise = null;
            throw error;
        });
        return this.readyPromise;
    }
    async stop() {
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
        if (watcher)
            await watcher.close();
    }
    async listResumeSessions(options) {
        await this.ensureReady();
        const sessions = this.store.listCodexSessions(this.codexHome, resolveCodexCwdKey(options.cwd), options.limit);
        return sessions.filter((session) => {
            if (existsSync(session.filePath))
                return true;
            this.store.deleteCodexSessionByFilePath(this.codexHome, session.filePath);
            return false;
        });
    }
    async readSessionPreview(options) {
        await this.ensureReady();
        const session = this.store.getCodexSession(this.codexHome, options.threadId.trim());
        if (!session)
            return null;
        if (!existsSync(session.filePath)) {
            this.store.deleteCodexSessionByFilePath(this.codexHome, session.filePath);
            return null;
        }
        return readCodexSessionPreviewFromFile(session.filePath, this.codexHome, this.codexHome, options.messageLimit);
    }
    async initialize() {
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
        await new Promise((resolveReady, rejectReady) => {
            this.watcher?.once('ready', resolveReady);
            this.watcher?.once('error', rejectReady);
        });
    }
    queueChange(path) {
        if (!this.started)
            return;
        const resolved = resolve(path);
        if (resolved === this.indexPath) {
            this.pendingIndexRefresh = true;
            this.scheduleFlush();
            return;
        }
        if (!resolved.startsWith(`${this.sessionsDir}/`))
            return;
        if (!existsSync(resolved)) {
            this.pendingSessionPaths.add(resolved);
            this.scheduleFlush();
            return;
        }
        this.pendingSessionPaths.add(resolved);
        this.scheduleFlush();
    }
    queueDirectory(path) {
        if (!this.started)
            return;
        const resolved = resolve(path);
        if (!resolved.startsWith(`${this.sessionsDir}/`))
            return;
        this.pendingSessionDirs.add(resolved);
        this.scheduleFlush();
    }
    isIgnoredWatchPath(path) {
        const resolved = resolve(path);
        return resolved !== this.codexHome
            && resolved !== this.indexPath
            && resolved !== this.sessionsDir
            && !resolved.startsWith(`${this.sessionsDir}/`);
    }
    scheduleFlush() {
        if (this.flushTimer)
            return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPending();
        }, WATCH_DEBOUNCE_MS);
    }
    async flushPending() {
        const indexDirty = this.pendingIndexRefresh;
        const sessionPaths = new Set(this.pendingSessionPaths);
        const sessionDirs = [...this.pendingSessionDirs];
        if (!indexDirty && sessionPaths.size === 0 && sessionDirs.length === 0)
            return;
        this.pendingIndexRefresh = false;
        this.pendingSessionPaths.clear();
        this.pendingSessionDirs.clear();
        for (const dir of sessionDirs) {
            if (!existsSync(dir))
                continue;
            for (const filePath of listCodexSessionFilesUnder(dir))
                sessionPaths.add(filePath);
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
            }
            else {
                this.store.deleteCodexSessionByFilePath(this.codexHome, filePath);
            }
        }
    }
    rebuildIndex() {
        this.store.replaceCodexSessions(this.codexHome, scanCodexSessionRecords(this.codexHome));
    }
}
