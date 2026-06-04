import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveWorkspacePath } from '../config/config.js';
import { truncate } from '../utils.js';
import { logger } from '../logger.js';
import { CodexRuntime } from '../agents/codex/runtime.js';
import { CODEX_NATIVE_ACTIVITY_TTL_MS, codexNativeActivityStateAt, codexNativeActivityView, isLeaseBackedCodexNativeActivity, normalizeCodexNativeHookEvent, } from '../agents/codex/hooks.js';
import { readCodexSessionTranscript } from '../agents/codex/sessions.js';
const DEFAULT_CONTROL_TTL_MS = 10 * 60 * 1000;
const INTERRUPTED_RESTART_ERROR = 'Hub restarted before the Codex turn finished';
const ACTIVE_PROMPT_JOB_STATUSES = ['running', 'queued'];
export class ControlHub {
    config;
    store;
    events;
    permissions;
    runtimes = new Map();
    pumpingSessions = new Set();
    nativeActivityTimers = new Map();
    constructor(config, store, events, permissions) {
        this.config = config;
        this.store = store;
        this.events = events;
        this.permissions = permissions;
        this.recoverPromptQueue();
    }
    stats() {
        return {
            ...this.store.stats(),
            runtimes: this.runtimes.size,
        };
    }
    createSession(input) {
        return this.createSessionRecord({ ...input, codexThreadId: null });
    }
    adoptCodexThread(input) {
        const threadId = input.threadId.trim();
        if (!threadId)
            throw new Error('Codex thread id is required');
        const existing = this.store.getSessionByCodexThreadId(threadId);
        if (existing)
            throw new Error(`Codex thread is already managed by Hub session: ${existing.id}`);
        const transcript = input.importTranscript
            ? readCodexSessionTranscript({ threadId, codexHome: input.codexHome })
            : null;
        if (input.importTranscript && !transcript)
            throw new Error(`Codex thread not found: ${threadId}`);
        const cwd = resolveWorkspacePath(this.config, input.cwd);
        if (transcript && resolve(transcript.session.cwd) !== cwd) {
            throw new Error(`Codex thread cwd does not match selected directory: ${transcript.session.cwd}`);
        }
        const session = this.createSessionRecord({ ...input, codexThreadId: threadId });
        const importedMessages = transcript ? this.importTranscript(session.id, threadId, transcript.messages) : 0;
        logger.info('codex thread adopted', { sessionKey: session.id, threadId, cwd: session.cwd, importedMessages });
        return session;
    }
    createSessionRecord(input) {
        const cwd = resolveWorkspacePath(this.config, input.cwd);
        if (!existsSync(cwd))
            throw new Error(`Path does not exist: ${cwd}`);
        if (!statSync(cwd).isDirectory())
            throw new Error(`Path is not a directory: ${cwd}`);
        const now = Date.now();
        const session = {
            id: randomUUID(),
            title: input.title?.trim() || basename(cwd) || cwd,
            cwd,
            agent: 'codex',
            status: 'idle',
            codexThreadId: input.codexThreadId,
            currentTurnId: null,
            controlOwner: null,
            controlOwnerId: null,
            controlLabel: null,
            controlLeaseExpiresAt: null,
            controlUpdatedAt: null,
            config: normalizeSessionConfig({
                ...this.defaultSessionConfig(),
                ...normalizeConfigPatch(input.config),
            }),
            createdAt: now,
            updatedAt: now,
            lastError: null,
        };
        this.store.createSession(session);
        this.events.publish({ type: 'session.created', sessionId: session.id, payload: { session } });
        if (input.bind) {
            this.bindControl(input.bind.controlType, input.bind.externalId, session.id);
        }
        logger.info('session created', { sessionKey: session.id, cwd });
        return session;
    }
    defaultSessionConfig() {
        return normalizeSessionConfig({
            model: runtimeOverride(this.config.agents.codex.model),
            reasoningEffort: runtimeOverride(this.config.agents.codex.reasoningEffort),
            permissionMode: this.config.agents.codex.permissionMode,
            search: this.config.agents.codex.search,
        });
    }
    getSession(id) {
        const session = this.store.getSession(id);
        if (!session)
            throw new Error(`Session not found: ${id}`);
        return session;
    }
    listSessions(cwd) {
        return this.store.listSessions(cwd);
    }
    getSessionDetail(sessionId) {
        const session = this.getSession(sessionId);
        return {
            session,
            messages: this.store.listMessages(session.id),
            approvals: this.store.listApprovals({ sessionId: session.id, status: 'pending' }),
            queue: this.store.listPromptJobs({ sessionId: session.id, statuses: ACTIVE_PROMPT_JOB_STATUSES, limit: 50 }),
            nativeCodexActivity: session.codexThreadId ? this.getCodexNativeActivityView(session.codexThreadId) : null,
            eventCursor: this.latestEventId(session.id),
        };
    }
    listMessages(sessionId, query = 200) {
        this.getSession(sessionId);
        return this.store.listMessages(sessionId, query);
    }
    listApprovals(query = {}) {
        if (query.sessionId)
            this.getSession(query.sessionId);
        return this.store.listApprovals(query);
    }
    listEvents(afterId = 0, sessionId) {
        if (sessionId)
            this.getSession(sessionId);
        return this.store.listEvents(afterId, sessionId);
    }
    latestEventId(sessionId, verifySession = true) {
        if (sessionId && verifySession)
            this.getSession(sessionId);
        return this.store.latestEventId(sessionId);
    }
    listPromptJobs(sessionId, query = {}) {
        this.getSession(sessionId);
        return this.store.listPromptJobs({ ...query, sessionId });
    }
    renameSession(sessionId, title) {
        const trimmed = title.trim();
        if (!trimmed)
            throw new Error('Session title is required');
        const session = this.store.updateSessionTitle(sessionId, trimmed);
        if (!session)
            throw new Error(`Session not found: ${sessionId}`);
        this.events.publish({ type: 'session.updated', sessionId, payload: { session } });
        return session;
    }
    async updateSessionConfig(sessionId, patch) {
        const session = this.getSession(sessionId);
        if (this.isBusy(session) || this.store.countPromptJobs(ACTIVE_PROMPT_JOB_STATUSES, sessionId) > 0) {
            throw new Error('Session is already running');
        }
        const entry = this.runtimes.get(sessionId);
        if (entry) {
            await entry.runtime.stop();
            this.runtimes.delete(sessionId);
        }
        const nextConfig = normalizeSessionConfig({
            ...session.config,
            ...normalizeConfigPatch(patch),
        });
        return this.patchSession(sessionId, { config: nextConfig });
    }
    async deleteSession(sessionId) {
        const session = this.getSession(sessionId);
        const entry = this.runtimes.get(sessionId);
        if (entry) {
            await entry.runtime.stop();
            this.runtimes.delete(sessionId);
        }
        this.pumpingSessions.delete(sessionId);
        this.store.deleteSession(sessionId);
        this.events.publish({ type: 'session.deleted', sessionId, payload: { session } });
    }
    claimControl(sessionId, input) {
        const current = this.getSession(sessionId);
        if (current.controlOwnerId && !isExpiredControl(current) && current.controlOwnerId !== input.ownerId) {
            throw new Error(`Session is controlled by ${current.controlLabel ?? current.controlOwnerId}`);
        }
        const now = Date.now();
        const session = this.store.updateSessionControl(sessionId, {
            controlOwner: input.controlType,
            controlOwnerId: input.ownerId,
            controlLabel: input.label?.trim() || input.ownerId,
            controlLeaseExpiresAt: now + (input.ttlMs ?? DEFAULT_CONTROL_TTL_MS),
            controlUpdatedAt: now,
        });
        if (!session)
            throw new Error(`Session not found: ${sessionId}`);
        this.events.publish({ type: 'session.control.updated', sessionId, payload: { session } });
        return session;
    }
    releaseControl(sessionId, ownerId) {
        const session = this.getSession(sessionId);
        if (ownerId && session.controlOwnerId && session.controlOwnerId !== ownerId) {
            throw new Error(`Session is controlled by ${session.controlLabel ?? session.controlOwnerId}`);
        }
        return this.clearControl(sessionId);
    }
    bindControl(controlType, externalId, sessionId) {
        this.getSession(sessionId);
        const now = Date.now();
        const binding = this.store.upsertBinding({
            id: randomUUID(),
            controlType,
            externalId,
            sessionId,
            createdAt: now,
            updatedAt: now,
        });
        this.events.publish({ type: 'session.updated', sessionId, payload: { binding } });
        return binding;
    }
    getBinding(controlType, externalId) {
        return this.store.getBinding(controlType, externalId);
    }
    listBindings(controlType) {
        return this.store.listBindings(controlType);
    }
    async sendMessage(sessionId, text, source, control = {}) {
        const trimmed = text.trim();
        if (!trimmed)
            throw new Error('Message text is required');
        const session = this.getSession(sessionId);
        this.assertControl(session, source, control.ownerId);
        const queued = this.isBusy(session)
            || this.pumpingSessions.has(sessionId)
            || this.store.countPromptJobs(['queued', 'running'], sessionId) > 0;
        const userMessage = this.addMessage({
            sessionId,
            role: 'user',
            kind: 'text',
            content: trimmed,
            metadata: { source, ownerId: control.ownerId, controlLabel: control.label, queued },
        });
        this.enqueuePrompt({
            sessionId,
            text: trimmed,
            source,
            ownerId: control.ownerId ?? null,
            controlLabel: control.label ?? null,
        });
        void this.pumpPromptQueue(sessionId);
        return userMessage;
    }
    async startPrompt(job) {
        let entry;
        try {
            entry = await this.ensureRuntime(job.sessionId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.failPromptJob(job, message);
            return;
        }
        entry.output = '';
        this.patchSession(job.sessionId, { status: 'running', lastError: null });
        void entry.runtime.sendPrompt(job.text).catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            this.failPromptJob(job, message);
        });
    }
    async interrupt(sessionId) {
        this.getSession(sessionId);
        const entry = this.runtimes.get(sessionId);
        await entry?.runtime.interrupt();
        this.store.cancelPromptJobs(sessionId, ['queued', 'running'], 'interrupted');
        this.permissions.expireSessionApprovals(sessionId, 'interrupted');
        this.publishQueueStatus(sessionId);
        this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
    }
    async resolveApproval(approvalId, decision, source) {
        await this.permissions.resolveApproval(approvalId, decision, source);
    }
    recordCodexHook(input) {
        const event = normalizeCodexNativeHookEvent(input);
        if (!event)
            throw new Error('Invalid Codex hook payload');
        const stored = this.store.upsertCodexNativeActivity({
            nativeSessionId: event.nativeSessionId,
            threadId: event.threadId,
            cwd: event.cwd,
            transcriptPath: event.transcriptPath,
            turnId: event.turnId,
            state: event.state,
            lastEventName: event.lastEventName,
            lastEventAt: event.lastEventAt,
            lastAssistantMessage: event.lastAssistantMessage,
        });
        const activity = codexNativeActivityView(stored);
        this.scheduleCodexNativeActivityExpiry(stored);
        this.publishCodexNativeActivity(activity);
        return activity;
    }
    async shutdown() {
        this.permissions.shutdown();
        for (const timer of this.nativeActivityTimers.values())
            clearTimeout(timer);
        this.nativeActivityTimers.clear();
        for (const sessionId of this.runtimes.keys()) {
            this.store.cancelPromptJobs(sessionId, ['running'], 'hub shutdown');
            const session = this.store.getSession(sessionId);
            if (session && this.isBusy(session)) {
                this.store.updateSession({
                    ...session,
                    status: 'idle',
                    currentTurnId: null,
                    updatedAt: Date.now(),
                });
            }
        }
        await Promise.all([...this.runtimes.values()].map((entry) => entry.runtime.stop().catch(() => { })));
        this.runtimes.clear();
    }
    async ensureRuntime(sessionId) {
        const existing = this.runtimes.get(sessionId);
        if (existing)
            return existing;
        const session = this.getSession(sessionId);
        const entry = {
            output: '',
            runtime: new CodexRuntime({
                bin: this.config.agents.codex.bin,
                session,
                onEvent: (event) => this.handleCodexEvent(sessionId, event),
                onThread: (threadId) => {
                    this.patchSession(sessionId, { codexThreadId: threadId });
                },
                onTurn: (turnId) => {
                    this.patchSession(sessionId, { currentTurnId: turnId, status: turnId ? 'running' : 'idle' });
                },
                onApproval: (toolName, input) => {
                    this.patchSession(sessionId, { status: 'waiting_approval' });
                    return this.permissions.requestApproval(sessionId, toolName, input);
                },
                onChoice: (input) => {
                    this.patchSession(sessionId, { status: 'waiting_approval' });
                    return this.permissions.requestChoice(sessionId, input);
                },
            }),
        };
        this.runtimes.set(sessionId, entry);
        await entry.runtime.start();
        return entry;
    }
    handleCodexEvent(sessionId, event) {
        const entry = this.runtimes.get(sessionId);
        this.events.publish({ type: 'runtime.event', sessionId, payload: { event } });
        if (event.type === 'agent_message_delta') {
            const delta = String(event.delta ?? '');
            if (entry)
                entry.output += delta;
            this.events.publish({ type: 'message.delta', sessionId, payload: { delta } });
            return;
        }
        if (event.type === 'agent_message') {
            const text = String(event.message ?? '');
            if (entry && text && !entry.output.includes(text))
                entry.output += text;
            return;
        }
        if (event.type === 'exec_command_begin') {
            const command = truncate(String(event.command ?? ''), 500);
            this.addMessage({
                sessionId,
                role: 'tool',
                kind: 'event',
                content: `[command]\n${command}`,
                metadata: { event },
            });
            return;
        }
        if (event.type === 'patch_apply_begin') {
            this.addMessage({
                sessionId,
                role: 'tool',
                kind: 'event',
                content: '[file change requested]',
                metadata: { event },
            });
            return;
        }
        if (event.type === 'task_complete') {
            const content = entry?.output.trim() || 'Done.';
            this.addMessage({
                sessionId,
                role: 'assistant',
                kind: 'text',
                content,
                metadata: {},
            });
            if (entry)
                entry.output = '';
            this.finishRunningPrompt(sessionId, 'done', null);
            this.publishQueueStatus(sessionId);
            this.patchSession(sessionId, { status: 'idle', currentTurnId: null, lastError: null });
            void this.pumpPromptQueue(sessionId);
            return;
        }
        if (event.type === 'task_failed') {
            const error = String(event.error ?? 'unknown error');
            this.addMessage({
                sessionId,
                role: 'assistant',
                kind: 'error',
                content: error,
                metadata: { event },
            });
            if (entry)
                entry.output = '';
            this.finishRunningPrompt(sessionId, 'failed', error);
            this.store.cancelPromptJobs(sessionId, ['queued'], 'previous prompt failed');
            this.publishQueueStatus(sessionId);
            this.patchSession(sessionId, { status: 'error', currentTurnId: null, lastError: error });
            return;
        }
        if (event.type === 'turn_aborted') {
            this.addMessage({
                sessionId,
                role: 'assistant',
                kind: 'event',
                content: 'Codex stopped.',
                metadata: { event },
            });
            if (entry)
                entry.output = '';
            this.store.cancelPromptJobs(sessionId, ['queued', 'running'], 'turn aborted');
            this.publishQueueStatus(sessionId);
            this.patchSession(sessionId, { status: 'idle', currentTurnId: null });
        }
    }
    enqueuePrompt(prompt) {
        const now = Date.now();
        const job = this.store.createPromptJob({
            id: randomUUID(),
            sessionId: prompt.sessionId,
            text: prompt.text,
            source: prompt.source,
            ownerId: prompt.ownerId,
            controlLabel: prompt.controlLabel,
            status: 'queued',
            error: null,
            createdAt: now,
            updatedAt: now,
            startedAt: null,
            finishedAt: null,
        });
        this.publishQueueStatus(prompt.sessionId);
        return job;
    }
    async pumpPromptQueue(sessionId) {
        if (this.pumpingSessions.has(sessionId))
            return;
        this.pumpingSessions.add(sessionId);
        try {
            const session = this.getSession(sessionId);
            if (this.isBusy(session))
                return;
            const next = this.store.getNextQueuedPromptJob(sessionId);
            if (!next)
                return;
            const running = this.store.updatePromptJobStatus(next.id, 'running', {
                error: null,
                startedAt: Date.now(),
                finishedAt: null,
            });
            if (!running)
                return;
            this.publishQueueStatus(sessionId);
            await this.startPrompt(running);
        }
        finally {
            this.pumpingSessions.delete(sessionId);
        }
    }
    importTranscript(sessionId, threadId, messages) {
        for (const message of messages) {
            this.addMessage({
                sessionId,
                role: message.role,
                kind: 'text',
                content: message.content,
                metadata: { source: 'codex-transcript', threadId },
                createdAt: message.createdAt,
            });
        }
        return messages.length;
    }
    addMessage(input) {
        const message = this.store.createMessage({
            ...input,
            id: randomUUID(),
            createdAt: input.createdAt ?? Date.now(),
        });
        this.events.publish({ type: 'message.created', sessionId: message.sessionId, payload: { message } });
        const session = this.store.getSession(message.sessionId);
        if (session)
            this.patchSession(message.sessionId, { updatedAt: Date.now() });
        return message;
    }
    patchSession(sessionId, patch) {
        const current = this.getSession(sessionId);
        const session = this.store.updateSession({
            ...current,
            ...patch,
            updatedAt: Date.now(),
        });
        this.events.publish({ type: 'session.updated', sessionId, payload: { session } });
        return session;
    }
    publishQueueStatus(sessionId) {
        this.events.publish({
            type: 'session.updated',
            sessionId,
            payload: { queuedPrompts: this.store.countPromptJobs(['queued'], sessionId) },
        });
    }
    finishRunningPrompt(sessionId, status, error) {
        const running = this.store.getRunningPromptJob(sessionId);
        if (!running)
            return;
        this.store.updatePromptJobStatus(running.id, status, { error, finishedAt: Date.now() });
    }
    getCodexNativeActivityView(threadId) {
        const activity = this.store.getCodexNativeActivity(threadId);
        return activity ? codexNativeActivityView(activity) : null;
    }
    publishCodexNativeActivity(activity) {
        const managedSession = this.store.getSessionByCodexThreadId(activity.threadId);
        this.events.publish({
            type: 'codex.native.activity.updated',
            sessionId: managedSession?.id ?? null,
            payload: {
                activity,
                managedSessionId: managedSession?.id ?? null,
            },
        });
    }
    scheduleCodexNativeActivityExpiry(activity) {
        const existing = this.nativeActivityTimers.get(activity.threadId);
        if (existing)
            clearTimeout(existing);
        this.nativeActivityTimers.delete(activity.threadId);
        if (!isLeaseBackedCodexNativeActivity(activity))
            return;
        const delayMs = Math.max(0, CODEX_NATIVE_ACTIVITY_TTL_MS - (Date.now() - activity.lastEventAt));
        const timer = setTimeout(() => {
            this.nativeActivityTimers.delete(activity.threadId);
            this.expireCodexNativeActivity(activity.threadId);
        }, delayMs);
        timer.unref();
        this.nativeActivityTimers.set(activity.threadId, timer);
    }
    expireCodexNativeActivity(threadId) {
        const latest = this.store.getCodexNativeActivity(threadId);
        if (!latest || !isLeaseBackedCodexNativeActivity(latest))
            return;
        if (codexNativeActivityStateAt(latest) !== 'unknown') {
            this.scheduleCodexNativeActivityExpiry(latest);
            return;
        }
        const activity = this.store.upsertCodexNativeActivity({ ...latest, state: 'unknown' });
        this.publishCodexNativeActivity(activity);
    }
    failPromptJob(job, message) {
        const current = this.store.getPromptJob(job.id);
        if (!current || current.status !== 'running')
            return;
        this.store.updatePromptJobStatus(job.id, 'failed', { error: message, finishedAt: Date.now() });
        this.addMessage({
            sessionId: job.sessionId,
            role: 'system',
            kind: 'error',
            content: message,
            metadata: { source: 'runtime' },
        });
        this.patchSession(job.sessionId, { status: 'error', lastError: message, currentTurnId: null });
        this.publishQueueStatus(job.sessionId);
        this.events.publish({ type: 'runtime.error', sessionId: job.sessionId, payload: { error: message } });
    }
    recoverPromptQueue() {
        const failed = this.store.failRunningPromptJobs(INTERRUPTED_RESTART_ERROR);
        if (failed > 0)
            logger.warn('running prompt jobs marked failed after restart', { failed });
        for (const session of this.store.listSessions()) {
            if (session.status === 'running' || session.status === 'waiting_approval') {
                this.permissions.expireSessionApprovals(session.id, INTERRUPTED_RESTART_ERROR);
                this.store.updateSession({
                    ...session,
                    status: 'error',
                    currentTurnId: null,
                    lastError: INTERRUPTED_RESTART_ERROR,
                    updatedAt: Date.now(),
                });
            }
        }
        for (const sessionId of this.store.listSessionsWithQueuedPromptJobs()) {
            void this.pumpPromptQueue(sessionId);
        }
    }
    assertControl(session, source, ownerId) {
        if (!session.controlOwner || !session.controlOwnerId)
            return;
        if (isExpiredControl(session)) {
            this.clearControl(session.id);
            return;
        }
        if (session.controlOwner === source && session.controlOwnerId === ownerId)
            return;
        throw new Error(`Session is controlled by ${session.controlLabel ?? session.controlOwner}`);
    }
    clearControl(sessionId) {
        const session = this.store.updateSessionControl(sessionId, {
            controlOwner: null,
            controlOwnerId: null,
            controlLabel: null,
            controlLeaseExpiresAt: null,
            controlUpdatedAt: Date.now(),
        });
        if (!session)
            throw new Error(`Session not found: ${sessionId}`);
        this.events.publish({ type: 'session.control.updated', sessionId, payload: { session } });
        return session;
    }
    isBusy(session) {
        return session.status === 'running' || session.status === 'waiting_approval';
    }
}
function runtimeOverride(value) {
    if (!value || value === 'auto' || value === 'default')
        return undefined;
    return value;
}
function normalizeConfigPatch(patch) {
    if (!patch)
        return {};
    return {
        ...patch,
        model: runtimeOverride(patch.model),
        reasoningEffort: runtimeOverride(patch.reasoningEffort),
    };
}
function normalizeSessionConfig(config) {
    return config;
}
function isExpiredControl(session) {
    return Boolean(session.controlLeaseExpiresAt && session.controlLeaseExpiresAt <= Date.now());
}
