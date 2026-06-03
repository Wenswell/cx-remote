import { asRecord, asString } from '../../utils.js';
import { logger } from '../../logger.js';
import { CodexAppServerClient } from './app-server-client.js';
import { CodexEventConverter } from './event-converter.js';
import { resolveCodexPermissionModeConfig } from './permission-mode.js';
export class CodexRuntime {
    options;
    client;
    converter = new CodexEventConverter();
    turnDone = null;
    ready = false;
    running = false;
    threadLoaded = false;
    threadId;
    turnId;
    constructor(options) {
        this.options = options;
        this.threadId = options.session.codexThreadId;
        this.turnId = options.session.currentTurnId;
        this.client = new CodexAppServerClient({
            bin: options.bin,
            search: options.session.config.search,
            onDisconnect: () => this.handleDisconnect(),
        });
    }
    get status() {
        return {
            ready: this.ready,
            running: this.running,
            threadId: this.threadId,
            turnId: this.turnId,
        };
    }
    async start() {
        if (this.ready)
            return;
        this.client.onNotification((method, params) => {
            for (const event of this.converter.convert(method, params)) {
                this.handleEvent(event);
            }
        });
        this.client.registerRequestHandler('item/commandExecution/requestApproval', async (params) => {
            const record = asRecord(params) ?? {};
            return mapApproval(await this.options.onApproval('CodexBash', {
                message: record.reason,
                command: record.command,
                cwd: record.cwd,
            }));
        });
        this.client.registerRequestHandler('item/fileChange/requestApproval', async (params) => {
            const record = asRecord(params) ?? {};
            return mapApproval(await this.options.onApproval('CodexPatch', {
                message: record.reason,
                grantRoot: record.grantRoot,
            }));
        });
        this.client.registerRequestHandler('item/tool/requestUserInput', async (params) => {
            return this.options.onChoice(params);
        });
        await this.client.connect();
        await this.client.initialize();
        this.ready = true;
        logger.info('codex runtime ready', { sessionKey: this.options.session.id, cwd: this.options.session.cwd });
    }
    async stop() {
        await this.client.disconnect();
        this.ready = false;
        this.running = false;
        this.threadLoaded = false;
        logger.info('codex runtime stopped', { sessionKey: this.options.session.id });
    }
    async interrupt() {
        if (this.threadId && this.turnId) {
            await this.client.interruptTurn(this.threadId, this.turnId);
        }
    }
    async sendPrompt(prompt, signal) {
        if (this.running)
            throw new Error('Codex is already running in this session');
        this.running = true;
        logger.info('codex prompt start', {
            sessionKey: this.options.session.id,
            cwd: this.options.session.cwd,
            threadId: this.threadId,
            promptLength: prompt.length,
        });
        try {
            await this.start();
            if (!this.threadId) {
                const response = await this.client.startThread({
                    ...this.threadParams(),
                });
                this.threadId = extractThreadId(response) ?? this.threadId;
                if (this.threadId)
                    this.options.onThread(this.threadId);
                this.threadLoaded = true;
            }
            else if (!this.threadLoaded) {
                const response = await this.client.resumeThread({
                    threadId: this.threadId,
                    ...this.threadParams(),
                });
                this.threadId = extractThreadId(response) ?? this.threadId;
                if (this.threadId)
                    this.options.onThread(this.threadId);
                this.threadLoaded = true;
            }
            if (!this.threadId)
                throw new Error('Codex did not return a thread id');
            const turnDone = createTurnDone();
            this.turnDone = turnDone;
            const runtimeConfig = resolveCodexPermissionModeConfig(this.options.session.config.permissionMode);
            const response = await this.client.startTurn({
                threadId: this.threadId,
                cwd: this.options.session.cwd,
                input: [{ type: 'text', text: prompt }],
                approvalPolicy: runtimeConfig.approvalPolicy,
                permissions: runtimeConfig.permissions,
                model: emptyToUndefined(this.options.session.config.model),
                effort: emptyToUndefined(this.options.session.config.reasoningEffort),
            }, signal);
            this.turnId = extractTurnId(response) ?? this.turnId;
            this.options.onTurn(this.turnId);
            await turnDone.promise;
        }
        finally {
            this.turnDone?.resolve();
            this.turnDone = null;
            this.running = false;
            this.options.onTurn(null);
            logger.info('codex prompt finished', { sessionKey: this.options.session.id, threadId: this.threadId });
        }
    }
    handleEvent(event) {
        if (event.type === 'thread_started') {
            this.threadId = asString(event.thread_id) ?? this.threadId;
            this.threadLoaded = true;
            if (this.threadId)
                this.options.onThread(this.threadId);
        }
        if (event.type === 'task_started') {
            this.turnId = asString(event.turn_id) ?? this.turnId;
            this.options.onTurn(this.turnId);
        }
        if (event.type === 'task_complete' || event.type === 'task_failed' || event.type === 'turn_aborted') {
            this.turnId = null;
            this.options.onTurn(null);
            this.turnDone?.resolve();
            this.turnDone = null;
        }
        this.options.onEvent(event);
    }
    handleDisconnect() {
        this.ready = false;
        this.running = false;
        this.threadLoaded = false;
        this.turnDone?.resolve();
        this.turnDone = null;
    }
    threadParams() {
        const runtimeConfig = resolveCodexPermissionModeConfig(this.options.session.config.permissionMode);
        return {
            cwd: this.options.session.cwd,
            approvalPolicy: runtimeConfig.approvalPolicy,
            permissions: runtimeConfig.permissions,
            model: emptyToUndefined(this.options.session.config.model),
            config: {
                ...(this.options.session.config.reasoningEffort ? { model_reasoning_effort: this.options.session.config.reasoningEffort } : {}),
            },
        };
    }
}
function mapApproval(result) {
    switch (result.decision) {
        case 'approved':
            return { decision: 'accept' };
        case 'approved_for_session':
            return { decision: 'acceptForSession' };
        case 'denied':
            return { decision: 'decline', reason: result.reason };
        case 'abort':
            return { decision: 'cancel', reason: result.reason };
    }
}
function createTurnDone() {
    let resolve;
    const promise = new Promise((r) => {
        resolve = r;
    });
    return { promise, resolve };
}
function extractThreadId(response) {
    const record = asRecord(response) ?? {};
    const thread = asRecord(record.thread);
    return asString(thread?.id ?? thread?.threadId ?? thread?.thread_id ?? record.threadId ?? record.thread_id) ?? null;
}
function extractTurnId(response) {
    const record = asRecord(response) ?? {};
    const turn = asRecord(record.turn);
    return asString(turn?.id ?? turn?.turnId ?? turn?.turn_id ?? record.turnId ?? record.turn_id) ?? null;
}
function emptyToUndefined(value) {
    return value && value.length > 0 ? value : undefined;
}
