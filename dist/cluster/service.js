import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { decodeSseFrame } from '../runtime/sse.js';
import { logger } from '../logger.js';
import { CodexSessionCatalog } from '../agents/codex/catalog.js';
export const LOCAL_NODE_ID = 'local';
const REMOTE_RECONNECT_DELAY_MS = 3_000;
const SNAPSHOT_TTL_MS = 15_000;
const SCOPE_LOCAL = 'local';
export class ClusterService {
    hub;
    events;
    config;
    codexHome;
    peers = new Map();
    codexCatalog;
    running = false;
    constructor(hub, events, config, codexHome, fetchImpl = fetch) {
        this.hub = hub;
        this.events = events;
        this.config = config;
        this.codexHome = codexHome;
        this.codexCatalog = new CodexSessionCatalog(this.hub.store, codexHome);
        for (const peer of config.cluster.peers) {
            this.peers.set(peer.id, {
                config: peer,
                client: new RemoteHubClient(peer, fetchImpl),
                snapshot: null,
                connected: false,
                error: null,
                lastSnapshotAt: 0,
                lastRemoteEventId: 0,
                controller: null,
                watchPromise: null,
            });
        }
    }
    async start() {
        if (this.running)
            return;
        this.running = true;
        if (this.config.workspace.roots.length > 0)
            await this.codexCatalog.ensureReady();
        for (const peer of this.peers.values()) {
            peer.watchPromise = this.watchPeer(peer);
        }
    }
    async stop() {
        this.running = false;
        for (const peer of this.peers.values()) {
            peer.controller?.abort();
        }
        await Promise.allSettled([...this.peers.values()].map((peer) => peer.watchPromise).filter(Boolean));
        for (const peer of this.peers.values()) {
            peer.controller = null;
            peer.watchPromise = null;
        }
        await this.codexCatalog.stop();
    }
    async listNodes(localOnly = false) {
        const nodes = [this.localNodeStatus()];
        if (localOnly)
            return nodes;
        const remote = await Promise.all([...this.peers.values()].map(async (peer) => {
            try {
                await this.ensureSnapshot(peer);
            }
            catch { }
            return this.peerNodeStatus(peer);
        }));
        return [...nodes, ...remote];
    }
    async listWorkspaces(localOnly = false) {
        const workspaces = localWorkspaces(this.config, this.localNodeDescriptor(), homedir());
        if (localOnly)
            return workspaces;
        const remote = await Promise.all([...this.peers.values()].map(async (peer) => {
            try {
                await this.ensureSnapshot(peer);
            }
            catch { }
            return peer.snapshot ? workspacesFromSnapshot(this.peerDescriptor(peer), peer.snapshot, peer.connected, peer.error) : [];
        }));
        return [...workspaces, ...remote.flat()];
    }
    async listSessions(input = {}) {
        if (input.localOnly)
            return this.localSessions(input.cwd);
        if (input.nodeId && input.nodeId !== LOCAL_NODE_ID)
            return this.remoteSessions(input.nodeId, input.cwd);
        if (input.nodeId === LOCAL_NODE_ID)
            return this.localSessions(input.cwd);
        const remote = await Promise.all([...this.peers.keys()].map((nodeId) => this.remoteSessions(nodeId, input.cwd).catch((error) => {
            logger.warn('remote sessions unavailable', { nodeId, error: errorMessage(error) });
            return [];
        })));
        return [...this.localSessions(input.cwd), ...remote.flat()].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    async createSession(input) {
        if (!input.nodeId || input.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), this.hub.createSession(input));
        }
        const peer = this.requirePeer(input.nodeId);
        const session = await peer.client.createSession(input);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async adoptSession(input) {
        if (!input.nodeId || input.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), this.hub.adoptCodexThread({
                ...input,
                codexHome: this.codexHome,
            }));
        }
        const peer = this.requirePeer(input.nodeId);
        const session = await peer.client.adoptSession(input);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async listCodexSessions(input) {
        if (input.localOnly || !input.nodeId || input.nodeId === LOCAL_NODE_ID) {
            const sessions = await this.localCodexSessions(input.cwd, input.limit);
            return { cwd: input.cwd, sessions };
        }
        const peer = this.requirePeer(input.nodeId);
        const response = await peer.client.listCodexSessions(input.cwd, input.limit);
        return {
            cwd: response.cwd,
            sessions: response.sessions.map((session) => this.decorateCodexSession(this.peerDescriptor(peer), session)),
        };
    }
    async previewCodexSession(input) {
        if (input.localOnly || !input.nodeId || input.nodeId === LOCAL_NODE_ID) {
            const preview = await this.localCodexPreview(input.threadId);
            return preview;
        }
        const peer = this.requirePeer(input.nodeId);
        const preview = await peer.client.previewCodexSession(input.threadId);
        return this.decorateCodexPreview(this.peerDescriptor(peer), preview);
    }
    async getSessionDetail(id) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            const detail = this.hub.getSessionDetail(target.localId);
            return this.decorateSessionDetail(this.localNodeDescriptor(), detail, this.hub.latestEventId(target.localId));
        }
        const peer = this.requirePeer(target.nodeId);
        const detail = await peer.client.getSessionDetail(target.localId);
        return this.decorateSessionDetail(this.peerDescriptor(peer), detail, this.hub.latestEventId(id, false));
    }
    async renameSession(id, title) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), this.hub.renameSession(target.localId, title));
        }
        const peer = this.requirePeer(target.nodeId);
        const session = await peer.client.renameSession(target.localId, title);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async updateSessionConfig(id, config) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), await this.hub.updateSessionConfig(target.localId, config));
        }
        const peer = this.requirePeer(target.nodeId);
        const session = await peer.client.updateSessionConfig(target.localId, config);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async deleteSession(id) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            await this.hub.deleteSession(target.localId);
            return;
        }
        const peer = this.requirePeer(target.nodeId);
        await peer.client.deleteSession(target.localId);
    }
    async claimControl(id, input) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), this.hub.claimControl(target.localId, {
                controlType: input.controlType,
                ownerId: input.ownerId,
                label: input.controlLabel,
                ttlMs: input.ttlMs,
            }));
        }
        const peer = this.requirePeer(target.nodeId);
        const session = await peer.client.claimControl(target.localId, input);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async releaseControl(id, ownerId) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.decorateSession(this.localNodeDescriptor(), this.hub.releaseControl(target.localId, ownerId));
        }
        const peer = this.requirePeer(target.nodeId);
        const session = await peer.client.releaseControl(target.localId, ownerId);
        return this.decorateSession(this.peerDescriptor(peer), session);
    }
    async listMessages(id, input = {}) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.hub.listMessages(target.localId, {
                limit: input.limit ?? 200,
                afterId: input.afterId ? this.parseScopedId(input.afterId).localId : undefined,
            }).map((message) => this.decorateMessage(this.localNodeDescriptor(), message));
        }
        const peer = this.requirePeer(target.nodeId);
        const messages = await peer.client.listMessages(target.localId, input.limit, scopedAfterId(target.nodeId, input.afterId));
        return messages.map((message) => this.decorateMessage(this.peerDescriptor(peer), message));
    }
    async listPromptJobs(id, query = {}) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.hub.listPromptJobs(target.localId, query).map((job) => this.decoratePromptJob(this.localNodeDescriptor(), job));
        }
        const peer = this.requirePeer(target.nodeId);
        const jobs = await peer.client.listPromptJobs(target.localId, query);
        return jobs.map((job) => this.decoratePromptJob(this.peerDescriptor(peer), job));
    }
    async sendMessage(id, input) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            return this.decorateMessage(this.localNodeDescriptor(), await this.hub.sendMessage(target.localId, input.text, input.controlType, {
                ownerId: input.ownerId,
                label: input.controlLabel,
            }));
        }
        const peer = this.requirePeer(target.nodeId);
        const message = await peer.client.sendMessage(target.localId, input);
        return this.decorateMessage(this.peerDescriptor(peer), message);
    }
    async interrupt(id) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            await this.hub.interrupt(target.localId);
            return;
        }
        const peer = this.requirePeer(target.nodeId);
        await peer.client.interrupt(target.localId);
    }
    async listApprovals(query = {}) {
        if (query.sessionId) {
            const target = this.parseScopedId(query.sessionId);
            if (target.nodeId === LOCAL_NODE_ID) {
                return this.hub.listApprovals({
                    sessionId: target.localId,
                    status: query.status,
                    limit: query.limit,
                }).map((approval) => this.decorateApproval(this.localNodeDescriptor(), approval));
            }
            const peer = this.requirePeer(target.nodeId);
            const approvals = await peer.client.listApprovals({
                sessionId: target.localId,
                status: query.status,
                limit: query.limit,
            });
            return approvals.map((approval) => this.decorateApproval(this.peerDescriptor(peer), approval));
        }
        if (query.localOnly) {
            return this.hub.listApprovals(query).map((approval) => this.decorateApproval(this.localNodeDescriptor(), approval));
        }
        const remote = await Promise.all([...this.peers.values()].map((peer) => peer.client.listApprovals(query).then((approvals) => {
            return approvals.map((approval) => this.decorateApproval(this.peerDescriptor(peer), approval));
        }).catch((error) => {
            logger.warn('remote approvals unavailable', { nodeId: peer.config.id, error: errorMessage(error) });
            return [];
        })));
        return [
            ...this.hub.listApprovals(query).map((approval) => this.decorateApproval(this.localNodeDescriptor(), approval)),
            ...remote.flat(),
        ];
    }
    async resolveApproval(id, decision, controlType) {
        const target = this.parseScopedId(id);
        if (target.nodeId === LOCAL_NODE_ID) {
            await this.hub.resolveApproval(target.localId, decision, controlType);
            return;
        }
        const peer = this.requirePeer(target.nodeId);
        await peer.client.resolveApproval(target.localId, decision, controlType);
    }
    async listFiles(workspaceId, path) {
        const workspace = await this.requireWorkspace(workspaceId);
        if (workspace.nodeId === LOCAL_NODE_ID) {
            return {
                workspaceId: workspace.id,
                nodeId: workspace.nodeId,
                nodeName: workspace.nodeName,
                homePath: workspace.homePath,
                ...localFilesPayload(this.config.workspace.roots, workspace.path, path),
            };
        }
        const peer = this.requirePeer(workspace.nodeId);
        const payload = await peer.client.listFiles(workspace.path, path);
        return {
            ...payload,
            workspaceId: workspace.id,
            nodeId: workspace.nodeId,
            nodeName: workspace.nodeName,
            homePath: workspace.homePath,
        };
    }
    async watchPeer(peer) {
        while (this.running) {
            const controller = new AbortController();
            peer.controller = controller;
            try {
                const snapshot = await this.refreshSnapshot(peer, true);
                if (peer.lastRemoteEventId <= 0)
                    peer.lastRemoteEventId = snapshot.eventCursor;
                await peer.client.streamEvents(peer.lastRemoteEventId, (event) => {
                    if (event.type === 'ready')
                        return;
                    if (typeof event.id === 'number' && event.id > peer.lastRemoteEventId) {
                        peer.lastRemoteEventId = event.id;
                    }
                    const normalized = this.normalizeRemoteEvent(this.peerDescriptor(peer), event);
                    this.events.publish(normalized);
                }, controller.signal);
                peer.connected = true;
                peer.error = null;
            }
            catch (error) {
                if (!this.running || controller.signal.aborted)
                    break;
                peer.connected = false;
                peer.error = errorMessage(error);
                logger.warn('remote event stream disconnected', { nodeId: peer.config.id, error: peer.error });
                await delay(REMOTE_RECONNECT_DELAY_MS);
            }
            finally {
                if (peer.controller === controller)
                    peer.controller = null;
            }
        }
    }
    normalizeRemoteEvent(node, event) {
        const payload = normalizePayload(node, event.payload || {});
        payload.nodeId = node.id;
        payload.nodeName = node.name;
        if (typeof event.id === 'number')
            payload.sourceEventId = event.id;
        return {
            type: event.type,
            sessionId: event.sessionId ? scopeId(node.id, event.sessionId) : null,
            payload,
            createdAt: event.createdAt,
        };
    }
    async ensureSnapshot(peer) {
        if (peer.snapshot && Date.now() - peer.lastSnapshotAt < SNAPSHOT_TTL_MS)
            return;
        await this.refreshSnapshot(peer, true);
    }
    async refreshSnapshot(peer, force) {
        if (!force && peer.snapshot && Date.now() - peer.lastSnapshotAt < SNAPSHOT_TTL_MS)
            return peer.snapshot;
        try {
            const snapshot = await peer.client.getStatus();
            peer.snapshot = snapshot;
            peer.connected = true;
            peer.error = null;
            peer.lastSnapshotAt = Date.now();
            return snapshot;
        }
        catch (error) {
            peer.connected = false;
            peer.error = errorMessage(error);
            if (peer.snapshot)
                return peer.snapshot;
            throw error;
        }
    }
    localNodeDescriptor() {
        return {
            id: LOCAL_NODE_ID,
            name: this.config.cluster.name,
            local: true,
        };
    }
    peerDescriptor(peer) {
        return {
            id: peer.config.id,
            name: peer.config.name,
            local: false,
        };
    }
    localNodeStatus() {
        return {
            ...this.localNodeDescriptor(),
            connected: true,
            homePath: homedir(),
            workspaceRoots: this.config.workspace.roots,
            error: null,
            stats: this.hub.stats(),
        };
    }
    peerNodeStatus(peer) {
        return {
            ...this.peerDescriptor(peer),
            connected: peer.connected,
            homePath: peer.snapshot?.homePath || '',
            workspaceRoots: peer.snapshot?.workspaceRoots || [],
            error: peer.error,
            stats: peer.snapshot?.stats || null,
        };
    }
    localSessions(cwd) {
        return this.hub.listSessions(cwd).map((session) => this.decorateSession(this.localNodeDescriptor(), session));
    }
    async remoteSessions(nodeId, cwd) {
        const peer = this.requirePeer(nodeId);
        const sessions = await peer.client.listSessions(cwd);
        return sessions.map((session) => this.decorateSession(this.peerDescriptor(peer), session));
    }
    async localCodexSessions(cwd, limit) {
        const managedSessionByThread = new Map(this.hub.listSessions()
            .filter((session) => session.codexThreadId)
            .map((session) => [session.codexThreadId, session.id]));
        const sessions = await this.codexCatalog.listResumeSessions({ cwd: resolve(cwd), limit });
        return sessions.map((session) => {
            return this.decorateCodexSession(this.localNodeDescriptor(), {
                ...session,
                managedSessionId: managedSessionByThread.get(session.id) || null,
            });
        });
    }
    async localCodexPreview(threadId) {
        const preview = await this.codexCatalog.readSessionPreview({ threadId });
        if (!preview)
            throw new Error(`Codex thread not found: ${threadId}`);
        const managed = this.hub.listSessions().find((session) => session.codexThreadId === threadId);
        return this.decorateCodexPreview(this.localNodeDescriptor(), {
            ...preview,
            managedSessionId: managed?.id ?? null,
        });
    }
    decorateSession(node, session) {
        return {
            ...session,
            id: scopeId(node.id, session.id),
            localId: session.id,
            nodeId: node.id,
            nodeName: node.name,
        };
    }
    decorateMessage(node, message) {
        return {
            ...message,
            id: scopeId(node.id, message.id),
            localId: message.id,
            nodeId: node.id,
            nodeName: node.name,
            sessionId: scopeId(node.id, message.sessionId),
        };
    }
    decorateApproval(node, approval) {
        return {
            ...approval,
            id: scopeId(node.id, approval.id),
            localId: approval.id,
            nodeId: node.id,
            nodeName: node.name,
            sessionId: scopeId(node.id, approval.sessionId),
        };
    }
    decoratePromptJob(node, job) {
        return {
            ...job,
            id: scopeId(node.id, job.id),
            localId: job.id,
            nodeId: node.id,
            nodeName: node.name,
            sessionId: scopeId(node.id, job.sessionId),
        };
    }
    decorateSessionDetail(node, detail, eventCursor) {
        return {
            session: this.decorateSession(node, detail.session),
            messages: detail.messages.map((message) => this.decorateMessage(node, message)),
            approvals: detail.approvals.map((approval) => this.decorateApproval(node, approval)),
            queue: detail.queue.map((job) => this.decoratePromptJob(node, job)),
            eventCursor,
        };
    }
    decorateCodexSession(node, session) {
        return {
            ...session,
            id: scopeId(node.id, session.id),
            localId: session.id,
            nodeId: node.id,
            nodeName: node.name,
            managedSessionId: session.managedSessionId ? scopeId(node.id, session.managedSessionId) : null,
        };
    }
    decorateCodexPreview(node, preview) {
        return {
            ...preview,
            id: scopeId(node.id, preview.id),
            localId: preview.id,
            nodeId: node.id,
            nodeName: node.name,
            managedSessionId: preview.managedSessionId ? scopeId(node.id, preview.managedSessionId) : null,
        };
    }
    requirePeer(nodeId) {
        const peer = this.peers.get(nodeId);
        if (!peer)
            throw new Error(`Unknown node: ${nodeId}`);
        return peer;
    }
    parseScopedId(id) {
        const index = id.indexOf('::');
        if (index < 0)
            return { nodeId: LOCAL_NODE_ID, localId: id };
        const nodeId = id.slice(0, index);
        const localId = id.slice(index + 2);
        if (!nodeId || !localId)
            throw new Error(`Invalid scoped id: ${id}`);
        this.requirePeer(nodeId);
        return { nodeId, localId };
    }
    async requireWorkspace(workspaceId) {
        const parsed = parseWorkspaceId(workspaceId);
        if (!parsed)
            throw new Error(`Invalid workspace: ${workspaceId}`);
        let workspace;
        if (parsed.nodeId === LOCAL_NODE_ID) {
            const root = this.config.workspace.roots[parsed.index];
            if (root !== parsed.path)
                throw new Error(`Unknown workspace: ${workspaceId}`);
            workspace = {
                id: workspaceId,
                nodeId: LOCAL_NODE_ID,
                nodeName: this.config.cluster.name,
                name: basename(root) || root,
                path: root,
                homePath: homedir(),
                connected: true,
                error: null,
            };
        }
        else {
            const peer = this.requirePeer(parsed.nodeId);
            await this.ensureSnapshot(peer);
            const root = peer.snapshot?.workspaceRoots[parsed.index];
            if (root !== parsed.path)
                throw new Error(`Unknown workspace: ${workspaceId}`);
            workspace = {
                id: workspaceId,
                nodeId: peer.config.id,
                nodeName: peer.config.name,
                name: basename(root) || root,
                path: root,
                homePath: peer.snapshot?.homePath || '',
                connected: peer.connected,
                error: peer.error,
            };
        }
        if (!workspace.connected)
            throw new Error(`Workspace node is unavailable: ${workspace.nodeName}`);
        return workspace;
    }
}
class RemoteHubClient {
    peer;
    fetchImpl;
    constructor(peer, fetchImpl) {
        this.peer = peer;
        this.fetchImpl = fetchImpl;
    }
    async getStatus() {
        return await this.get('/api/status', { scope: SCOPE_LOCAL });
    }
    async listSessions(cwd) {
        return await this.get('/api/sessions', {
            scope: SCOPE_LOCAL,
            ...(cwd ? { cwd } : {}),
        });
    }
    async createSession(input) {
        return await this.post('/api/sessions', {
            cwd: input.cwd,
            title: input.title,
            config: input.config,
        });
    }
    async adoptSession(input) {
        return await this.post('/api/sessions/adopt', {
            threadId: input.threadId,
            cwd: input.cwd,
            title: input.title,
            config: input.config,
            importTranscript: input.importTranscript,
        });
    }
    async listCodexSessions(cwd, limit) {
        return await this.get('/api/codex/sessions', {
            scope: SCOPE_LOCAL,
            cwd,
            ...(limit ? { limit: String(limit) } : {}),
        });
    }
    async previewCodexSession(threadId) {
        return await this.get(`/api/codex/sessions/${encodeURIComponent(threadId)}/preview`, {
            scope: SCOPE_LOCAL,
        });
    }
    async getSessionDetail(id) {
        return await this.get(`/api/sessions/${encodeURIComponent(id)}`);
    }
    async renameSession(id, title) {
        return await this.patch(`/api/sessions/${encodeURIComponent(id)}`, { title });
    }
    async updateSessionConfig(id, config) {
        return await this.patch(`/api/sessions/${encodeURIComponent(id)}/config`, { config });
    }
    async deleteSession(id) {
        await this.delete(`/api/sessions/${encodeURIComponent(id)}`);
    }
    async claimControl(id, input) {
        return await this.patch(`/api/sessions/${encodeURIComponent(id)}/control`, input);
    }
    async releaseControl(id, ownerId) {
        const suffix = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
        return await this.delete(`/api/sessions/${encodeURIComponent(id)}/control${suffix}`);
    }
    async listMessages(id, limit, afterId) {
        return await this.get(`/api/sessions/${encodeURIComponent(id)}/messages`, {
            ...(limit ? { limit: String(limit) } : {}),
            ...(afterId ? { afterId } : {}),
        });
    }
    async listPromptJobs(id, query = {}) {
        return await this.get(`/api/sessions/${encodeURIComponent(id)}/queue`, {
            ...(query.limit ? { limit: String(query.limit) } : {}),
            ...(query.statuses ? { status: promptStatusQuery(query.statuses) } : {}),
        });
    }
    async sendMessage(id, input) {
        return await this.post(`/api/sessions/${encodeURIComponent(id)}/messages`, input);
    }
    async interrupt(id) {
        await this.post(`/api/sessions/${encodeURIComponent(id)}/interrupt`, {});
    }
    async listApprovals(query = {}) {
        return await this.get('/api/approvals', {
            scope: SCOPE_LOCAL,
            ...(query.sessionId ? { sessionId: query.sessionId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.limit ? { limit: String(query.limit) } : {}),
        });
    }
    async resolveApproval(id, decision, controlType) {
        await this.post(`/api/approvals/${encodeURIComponent(id)}/resolve`, { decision, controlType });
    }
    async listFiles(root, path) {
        return await this.get('/api/files', { root, path });
    }
    async streamEvents(afterId, onEvent, signal) {
        const url = this.url('/api/events', {
            scope: SCOPE_LOCAL,
            ...(afterId > 0 ? { afterId: String(afterId) } : {}),
        });
        const response = await this.fetchImpl(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.peer.accessToken}` },
            signal,
        });
        if (!response.ok)
            throw new Error(await parseRemoteError(response));
        if (!response.body)
            throw new Error('Remote event stream is missing a body');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!signal.aborted) {
            const { value, done } = await reader.read();
            if (done)
                return;
            buffer += decoder.decode(value, { stream: true });
            let index = buffer.indexOf('\n\n');
            while (index >= 0) {
                const frame = buffer.slice(0, index);
                buffer = buffer.slice(index + 2);
                const event = decodeSseFrame(frame);
                if (event)
                    onEvent(event);
                index = buffer.indexOf('\n\n');
            }
        }
    }
    async get(path, query = {}) {
        return await this.call('GET', path, undefined, query);
    }
    async post(path, body) {
        return await this.call('POST', path, body);
    }
    async patch(path, body) {
        return await this.call('PATCH', path, body);
    }
    async delete(path) {
        return await this.call('DELETE', path);
    }
    async call(method, path, body, query = {}) {
        const response = await this.fetchImpl(this.url(path, query), {
            method,
            headers: {
                Authorization: `Bearer ${this.peer.accessToken}`,
                ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!response.ok)
            throw new Error(await parseRemoteError(response));
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }
    url(path, query) {
        const url = new URL(path.replace(/^\/+/, ''), withTrailingSlash(this.peer.url));
        for (const [key, value] of Object.entries(query)) {
            if (value)
                url.searchParams.set(key, value);
        }
        return url.toString();
    }
}
function workspacesFromSnapshot(node, snapshot, connected, error) {
    return snapshot.workspaceRoots.map((root, index) => ({
        id: workspaceId(node.id, root, index),
        nodeId: node.id,
        nodeName: node.name,
        name: basename(root) || root,
        path: root,
        homePath: snapshot.homePath,
        connected,
        error,
    }));
}
function localWorkspaces(config, node, homePath) {
    return config.workspace.roots.map((root, index) => ({
        id: workspaceId(node.id, root, index),
        nodeId: node.id,
        nodeName: node.name,
        name: basename(root) || root,
        path: root,
        homePath,
        connected: true,
        error: null,
    }));
}
function localFilesPayload(roots, root, path) {
    const selectedRoot = roots.find((item) => item === root || item === resolve(root));
    if (!selectedRoot)
        throw new Error('Unknown workspace root');
    const current = resolve(selectedRoot, path || '.');
    if (!current.startsWith(`${resolve(selectedRoot)}/`) && current !== resolve(selectedRoot)) {
        throw new Error('Path must be inside the selected workspace root');
    }
    if (!existsSync(current))
        throw new Error(`Path does not exist: ${current}`);
    if (!statSync(current).isDirectory())
        throw new Error(`Path is not a directory: ${current}`);
    const entries = readdirSync(current, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
        const absolutePath = join(current, entry.name);
        return {
            name: entry.name,
            path: absolutePath,
            relativePath: relative(selectedRoot, absolutePath),
        };
    });
    const relativePath = relative(selectedRoot, current);
    return {
        root: selectedRoot,
        current,
        relativePath,
        parentPath: relativePath ? relative(selectedRoot, resolve(current, '..')) : '',
        entries,
    };
}
function normalizePayload(node, payload) {
    const next = structuredClone(payload);
    if (next.session && typeof next.session === 'object' && !Array.isArray(next.session)) {
        next.session = decorateSessionRecord(node, next.session);
    }
    if (next.message && typeof next.message === 'object' && !Array.isArray(next.message)) {
        next.message = decorateMessageRecord(node, next.message);
    }
    if (next.approval && typeof next.approval === 'object' && !Array.isArray(next.approval)) {
        next.approval = decorateApprovalRecord(node, next.approval);
    }
    if (next.binding && typeof next.binding === 'object' && !Array.isArray(next.binding)) {
        next.binding = decorateBindingRecord(node, next.binding);
    }
    return next;
}
function decorateSessionRecord(node, session) {
    return {
        ...session,
        id: scopeId(node.id, session.id),
        localId: session.id,
        nodeId: node.id,
        nodeName: node.name,
    };
}
function decorateMessageRecord(node, message) {
    return {
        ...message,
        id: scopeId(node.id, message.id),
        localId: message.id,
        nodeId: node.id,
        nodeName: node.name,
        sessionId: scopeId(node.id, message.sessionId),
    };
}
function decorateApprovalRecord(node, approval) {
    return {
        ...approval,
        id: scopeId(node.id, approval.id),
        localId: approval.id,
        nodeId: node.id,
        nodeName: node.name,
        sessionId: scopeId(node.id, approval.sessionId),
    };
}
function decorateBindingRecord(node, binding) {
    return {
        ...binding,
        id: scopeId(node.id, binding.id),
        localId: binding.id,
        nodeId: node.id,
        nodeName: node.name,
        sessionId: scopeId(node.id, binding.sessionId),
    };
}
function scopeId(nodeId, id) {
    return nodeId === LOCAL_NODE_ID ? id : `${nodeId}::${id}`;
}
function scopedAfterId(nodeId, id) {
    if (!id)
        return undefined;
    const index = id.indexOf('::');
    return index >= 0 && id.slice(0, index) === nodeId ? id.slice(index + 2) : id;
}
function workspaceId(nodeId, path, index) {
    return `${nodeId}::${index}::${path}`;
}
function parseWorkspaceId(id) {
    const first = id.indexOf('::');
    if (first < 0)
        return null;
    const second = id.indexOf('::', first + 2);
    if (second < 0)
        return null;
    const nodeId = id.slice(0, first);
    const indexText = id.slice(first + 2, second);
    const path = id.slice(second + 2);
    const index = Number(indexText);
    if (!nodeId || !path || !Number.isInteger(index) || index < 0)
        return null;
    return { nodeId, index, path };
}
function promptStatusQuery(statuses) {
    if (statuses.length === 2 && statuses.includes('queued') && statuses.includes('running'))
        return 'active';
    if (statuses.length === 1)
        return statuses[0];
    return 'all';
}
async function parseRemoteError(response) {
    const text = await response.text();
    try {
        const payload = JSON.parse(text);
        return payload.error?.message || text || response.statusText;
    }
    catch {
        return text || response.statusText;
    }
}
function withTrailingSlash(url) {
    return url.endsWith('/') ? url : `${url}/`;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
