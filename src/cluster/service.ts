import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import type { AppConfig, Settings } from '../config/config.js';
import type {
  Approval,
  ApprovalStatus,
  CodexSessionConfigPatch,
  ControlBinding,
  ControlType,
  HubEvent,
  Message,
  PromptJob,
  PromptJobStatus,
  Session,
  SessionDetail,
} from '../domain/types.js';
import { decodeSseFrame } from '../runtime/sse.js';
import type { ControlHub } from '../runtime/control-hub.js';
import type { EventBus } from '../runtime/event-bus.js';
import { logger } from '../logger.js';

export const LOCAL_NODE_ID = 'local';

const REMOTE_RECONNECT_DELAY_MS = 3_000;
const SNAPSHOT_TTL_MS = 15_000;
const SCOPE_LOCAL = 'local';

type FetchImpl = typeof fetch;

type RemoteStatus = {
  homePath: string;
  workspaceRoots: string[];
  eventCursor: number;
  stats: {
    sessions: number;
    pendingApprovals: number;
    queuedPrompts: number;
  };
};

type RemoteWorkspace = {
  id: string;
  nodeId: string;
  nodeName: string;
  name: string;
  path: string;
  homePath: string;
  connected: boolean;
  error: string | null;
};

type RemoteResumeSession = {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  originator: string;
  threadSource: string;
  managedSessionId: string | null;
};

type RemotePreviewMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

type RemotePreview = RemoteResumeSession & {
  messageCount: number;
  messages: RemotePreviewMessage[];
};

type RemoteSessionsResponse = {
  cwd: string;
  sessions: RemoteResumeSession[];
};

type RemoteEvent = {
  id?: number;
  type: string;
  sessionId?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: number;
};

type NodeDescriptor = {
  id: string;
  name: string;
  local: boolean;
};

type PeerRuntime = {
  config: Settings['cluster']['peers'][number];
  client: RemoteHubClient;
  snapshot: RemoteStatus | null;
  connected: boolean;
  error: string | null;
  lastSnapshotAt: number;
  lastRemoteEventId: number;
  controller: AbortController | null;
  watchPromise: Promise<void> | null;
};

export type NodeStatusView = {
  id: string;
  name: string;
  local: boolean;
  connected: boolean;
  homePath: string;
  workspaceRoots: string[];
  error: string | null;
  stats: {
    sessions: number;
    pendingApprovals: number;
    queuedPrompts: number;
  } | null;
};

export type WorkspaceView = {
  id: string;
  nodeId: string;
  nodeName: string;
  name: string;
  path: string;
  homePath: string;
  connected: boolean;
  error: string | null;
};

export type SessionView = Session & {
  localId: string;
  nodeId: string;
  nodeName: string;
};

export type MessageView = Message & {
  localId: string;
  nodeId: string;
  nodeName: string;
  sessionId: string;
};

export type ApprovalView = Approval & {
  localId: string;
  nodeId: string;
  nodeName: string;
  sessionId: string;
};

export type PromptJobView = PromptJob & {
  localId: string;
  nodeId: string;
  nodeName: string;
  sessionId: string;
};

export type SessionDetailView = {
  session: SessionView;
  messages: MessageView[];
  approvals: ApprovalView[];
  queue: PromptJobView[];
  eventCursor: number;
};

export type CodexSessionView = RemoteResumeSession & {
  nodeId: string;
  nodeName: string;
  localId: string;
  managedSessionId: string | null;
};

export type CodexPreviewView = RemotePreview & {
  nodeId: string;
  nodeName: string;
  localId: string;
  managedSessionId: string | null;
};

type PromptJobQuery = {
  statuses?: PromptJobStatus[];
  limit?: number;
};

type ApprovalQuery = {
  sessionId?: string;
  status?: ApprovalStatus;
  limit?: number;
};

type SendMessageInput = {
  text: string;
  controlType: ControlType;
  ownerId?: string;
  controlLabel?: string;
};

type ControlLeaseInput = {
  controlType: ControlType;
  ownerId: string;
  controlLabel?: string;
  ttlMs?: number;
};

export class ClusterService {
  private readonly peers = new Map<string, PeerRuntime>();
  private running = false;

  constructor(
    private readonly hub: ControlHub,
    private readonly events: EventBus,
    private readonly config: AppConfig,
    private readonly codexHome?: string,
    fetchImpl: FetchImpl = fetch,
  ) {
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

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    for (const peer of this.peers.values()) {
      peer.watchPromise = this.watchPeer(peer);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const peer of this.peers.values()) {
      peer.controller?.abort();
    }
    await Promise.allSettled([...this.peers.values()].map((peer) => peer.watchPromise).filter(Boolean));
    for (const peer of this.peers.values()) {
      peer.controller = null;
      peer.watchPromise = null;
    }
  }

  async listNodes(localOnly = false): Promise<NodeStatusView[]> {
    const nodes: NodeStatusView[] = [this.localNodeStatus()];
    if (localOnly) return nodes;

    const remote = await Promise.all([...this.peers.values()].map(async (peer) => {
      try {
        await this.ensureSnapshot(peer);
      } catch {}
      return this.peerNodeStatus(peer);
    }));
    return [...nodes, ...remote];
  }

  async listWorkspaces(localOnly = false): Promise<WorkspaceView[]> {
    const workspaces = localWorkspaces(this.config, this.localNodeDescriptor(), homedir());
    if (localOnly) return workspaces;
    const remote = await Promise.all([...this.peers.values()].map(async (peer) => {
      try {
        await this.ensureSnapshot(peer);
      } catch {}
      return peer.snapshot ? workspacesFromSnapshot(this.peerDescriptor(peer), peer.snapshot, peer.connected, peer.error) : [];
    }));
    return [...workspaces, ...remote.flat()];
  }

  async listSessions(input: { cwd?: string; nodeId?: string; localOnly?: boolean } = {}): Promise<SessionView[]> {
    if (input.localOnly) return this.localSessions(input.cwd);
    if (input.nodeId && input.nodeId !== LOCAL_NODE_ID) return this.remoteSessions(input.nodeId, input.cwd);
    if (input.nodeId === LOCAL_NODE_ID) return this.localSessions(input.cwd);
    const remote = await Promise.all([...this.peers.keys()].map((nodeId) => this.remoteSessions(nodeId, input.cwd).catch((error) => {
      logger.warn('remote sessions unavailable', { nodeId, error: errorMessage(error) });
      return [];
    })));
    return [...this.localSessions(input.cwd), ...remote.flat()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createSession(input: {
    nodeId?: string;
    cwd: string;
    title?: string;
    config?: CodexSessionConfigPatch;
  }): Promise<SessionView> {
    if (!input.nodeId || input.nodeId === LOCAL_NODE_ID) {
      return this.decorateSession(this.localNodeDescriptor(), this.hub.createSession(input));
    }
    const peer = this.requirePeer(input.nodeId);
    const session = await peer.client.createSession(input);
    return this.decorateSession(this.peerDescriptor(peer), session);
  }

  async adoptSession(input: {
    nodeId?: string;
    threadId: string;
    cwd: string;
    title?: string;
    config?: CodexSessionConfigPatch;
    importTranscript?: boolean;
  }): Promise<SessionView> {
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

  async listCodexSessions(input: {
    cwd: string;
    nodeId?: string;
    limit?: number;
    localOnly?: boolean;
  }): Promise<{ cwd: string; sessions: CodexSessionView[] }> {
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

  async previewCodexSession(input: {
    threadId: string;
    nodeId?: string;
    localOnly?: boolean;
  }): Promise<CodexPreviewView> {
    if (input.localOnly || !input.nodeId || input.nodeId === LOCAL_NODE_ID) {
      const preview = await this.localCodexPreview(input.threadId);
      return preview;
    }
    const peer = this.requirePeer(input.nodeId);
    const preview = await peer.client.previewCodexSession(input.threadId);
    return this.decorateCodexPreview(this.peerDescriptor(peer), preview);
  }

  async getSessionDetail(id: string): Promise<SessionDetailView> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      const detail = this.hub.getSessionDetail(target.localId);
      return this.decorateSessionDetail(this.localNodeDescriptor(), detail, this.hub.latestEventId(target.localId));
    }
    const peer = this.requirePeer(target.nodeId);
    const detail = await peer.client.getSessionDetail(target.localId);
    return this.decorateSessionDetail(this.peerDescriptor(peer), detail, this.hub.latestEventId(id, false));
  }

  async renameSession(id: string, title: string): Promise<SessionView> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      return this.decorateSession(this.localNodeDescriptor(), this.hub.renameSession(target.localId, title));
    }
    const peer = this.requirePeer(target.nodeId);
    const session = await peer.client.renameSession(target.localId, title);
    return this.decorateSession(this.peerDescriptor(peer), session);
  }

  async updateSessionConfig(id: string, config: CodexSessionConfigPatch): Promise<SessionView> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      return this.decorateSession(this.localNodeDescriptor(), await this.hub.updateSessionConfig(target.localId, config));
    }
    const peer = this.requirePeer(target.nodeId);
    const session = await peer.client.updateSessionConfig(target.localId, config);
    return this.decorateSession(this.peerDescriptor(peer), session);
  }

  async deleteSession(id: string): Promise<void> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      await this.hub.deleteSession(target.localId);
      return;
    }
    const peer = this.requirePeer(target.nodeId);
    await peer.client.deleteSession(target.localId);
  }

  async claimControl(id: string, input: ControlLeaseInput): Promise<SessionView> {
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

  async releaseControl(id: string, ownerId?: string): Promise<SessionView> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      return this.decorateSession(this.localNodeDescriptor(), this.hub.releaseControl(target.localId, ownerId));
    }
    const peer = this.requirePeer(target.nodeId);
    const session = await peer.client.releaseControl(target.localId, ownerId);
    return this.decorateSession(this.peerDescriptor(peer), session);
  }

  async listMessages(id: string, input: { limit?: number; afterId?: string } = {}): Promise<MessageView[]> {
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

  async listPromptJobs(id: string, query: PromptJobQuery = {}): Promise<PromptJobView[]> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      return this.hub.listPromptJobs(target.localId, query).map((job) => this.decoratePromptJob(this.localNodeDescriptor(), job));
    }
    const peer = this.requirePeer(target.nodeId);
    const jobs = await peer.client.listPromptJobs(target.localId, query);
    return jobs.map((job) => this.decoratePromptJob(this.peerDescriptor(peer), job));
  }

  async sendMessage(id: string, input: SendMessageInput): Promise<MessageView> {
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

  async interrupt(id: string): Promise<void> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      await this.hub.interrupt(target.localId);
      return;
    }
    const peer = this.requirePeer(target.nodeId);
    await peer.client.interrupt(target.localId);
  }

  async listApprovals(query: ApprovalQuery & { localOnly?: boolean } = {}): Promise<ApprovalView[]> {
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

  async resolveApproval(id: string, decision: string, controlType: ControlType): Promise<void> {
    const target = this.parseScopedId(id);
    if (target.nodeId === LOCAL_NODE_ID) {
      await this.hub.resolveApproval(target.localId, decision, controlType);
      return;
    }
    const peer = this.requirePeer(target.nodeId);
    await peer.client.resolveApproval(target.localId, decision, controlType);
  }

  async listFiles(workspaceId: string, path: string): Promise<{
    workspaceId: string;
    nodeId: string;
    nodeName: string;
    homePath: string;
    root: string;
    current: string;
    relativePath: string;
    parentPath: string;
    entries: Array<{ name: string; path: string; relativePath: string }>;
  }> {
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

  private async watchPeer(peer: PeerRuntime): Promise<void> {
    while (this.running) {
      const controller = new AbortController();
      peer.controller = controller;
      try {
        const snapshot = await this.refreshSnapshot(peer, true);
        if (peer.lastRemoteEventId <= 0) peer.lastRemoteEventId = snapshot.eventCursor;
        await peer.client.streamEvents(peer.lastRemoteEventId, (event) => {
          if (event.type === 'ready') return;
          if (typeof event.id === 'number' && event.id > peer.lastRemoteEventId) {
            peer.lastRemoteEventId = event.id;
          }
          const normalized = this.normalizeRemoteEvent(this.peerDescriptor(peer), event);
          this.events.publish(normalized);
        }, controller.signal);
        peer.connected = true;
        peer.error = null;
      } catch (error) {
        if (!this.running || controller.signal.aborted) break;
        peer.connected = false;
        peer.error = errorMessage(error);
        logger.warn('remote event stream disconnected', { nodeId: peer.config.id, error: peer.error });
        await delay(REMOTE_RECONNECT_DELAY_MS);
      } finally {
        if (peer.controller === controller) peer.controller = null;
      }
    }
  }

  private normalizeRemoteEvent(node: NodeDescriptor, event: RemoteEvent): Omit<HubEvent, 'id' | 'createdAt'> & {
    sessionId: string | null;
    payload: Record<string, unknown>;
    createdAt?: number;
  } {
    const payload = normalizePayload(node, event.payload || {});
    payload.nodeId = node.id;
    payload.nodeName = node.name;
    if (typeof event.id === 'number') payload.sourceEventId = event.id;
    return {
      type: event.type as HubEvent['type'],
      sessionId: event.sessionId ? scopeId(node.id, event.sessionId) : null,
      payload,
      createdAt: event.createdAt,
    };
  }

  private async ensureSnapshot(peer: PeerRuntime): Promise<void> {
    if (peer.snapshot && Date.now() - peer.lastSnapshotAt < SNAPSHOT_TTL_MS) return;
    await this.refreshSnapshot(peer, true);
  }

  private async refreshSnapshot(peer: PeerRuntime, force: boolean): Promise<RemoteStatus> {
    if (!force && peer.snapshot && Date.now() - peer.lastSnapshotAt < SNAPSHOT_TTL_MS) return peer.snapshot;
    try {
      const snapshot = await peer.client.getStatus();
      peer.snapshot = snapshot;
      peer.connected = true;
      peer.error = null;
      peer.lastSnapshotAt = Date.now();
      return snapshot;
    } catch (error) {
      peer.connected = false;
      peer.error = errorMessage(error);
      if (peer.snapshot) return peer.snapshot;
      throw error;
    }
  }

  private localNodeDescriptor(): NodeDescriptor {
    return {
      id: LOCAL_NODE_ID,
      name: this.config.cluster.name,
      local: true,
    };
  }

  private peerDescriptor(peer: PeerRuntime): NodeDescriptor {
    return {
      id: peer.config.id,
      name: peer.config.name,
      local: false,
    };
  }

  private localNodeStatus(): NodeStatusView {
    return {
      ...this.localNodeDescriptor(),
      connected: true,
      homePath: homedir(),
      workspaceRoots: this.config.workspace.roots,
      error: null,
      stats: this.hub.stats(),
    };
  }

  private peerNodeStatus(peer: PeerRuntime): NodeStatusView {
    return {
      ...this.peerDescriptor(peer),
      connected: peer.connected,
      homePath: peer.snapshot?.homePath || '',
      workspaceRoots: peer.snapshot?.workspaceRoots || [],
      error: peer.error,
      stats: peer.snapshot?.stats || null,
    };
  }

  private localSessions(cwd?: string): SessionView[] {
    return this.hub.listSessions(cwd).map((session) => this.decorateSession(this.localNodeDescriptor(), session));
  }

  private async remoteSessions(nodeId: string, cwd?: string): Promise<SessionView[]> {
    const peer = this.requirePeer(nodeId);
    const sessions = await peer.client.listSessions(cwd);
    return sessions.map((session) => this.decorateSession(this.peerDescriptor(peer), session));
  }

  private async localCodexSessions(cwd: string, limit?: number): Promise<CodexSessionView[]> {
    const local = await import('../agents/codex/sessions.js');
    const managedSessionByThread = new Map(
      this.hub.listSessions()
        .filter((session) => session.codexThreadId)
        .map((session) => [session.codexThreadId!, session.id]),
    );
    return local.listCodexResumeSessions({ cwd: resolve(cwd), limit, codexHome: this.codexHome }).map((session) => {
      return this.decorateCodexSession(this.localNodeDescriptor(), {
        ...session,
        managedSessionId: managedSessionByThread.get(session.id) || null,
      });
    });
  }

  private async localCodexPreview(threadId: string): Promise<CodexPreviewView> {
    const local = await import('../agents/codex/sessions.js');
    const preview = local.readCodexSessionPreview({ threadId, codexHome: this.codexHome });
    if (!preview) throw new Error(`Codex thread not found: ${threadId}`);
    const managed = this.hub.listSessions().find((session) => session.codexThreadId === threadId);
    return this.decorateCodexPreview(this.localNodeDescriptor(), {
      ...preview,
      managedSessionId: managed?.id ?? null,
    });
  }

  private decorateSession(node: NodeDescriptor, session: Session): SessionView {
    return {
      ...session,
      id: scopeId(node.id, session.id),
      localId: session.id,
      nodeId: node.id,
      nodeName: node.name,
    };
  }

  private decorateMessage(node: NodeDescriptor, message: Message): MessageView {
    return {
      ...message,
      id: scopeId(node.id, message.id),
      localId: message.id,
      nodeId: node.id,
      nodeName: node.name,
      sessionId: scopeId(node.id, message.sessionId),
    };
  }

  private decorateApproval(node: NodeDescriptor, approval: Approval): ApprovalView {
    return {
      ...approval,
      id: scopeId(node.id, approval.id),
      localId: approval.id,
      nodeId: node.id,
      nodeName: node.name,
      sessionId: scopeId(node.id, approval.sessionId),
    };
  }

  private decoratePromptJob(node: NodeDescriptor, job: PromptJob): PromptJobView {
    return {
      ...job,
      id: scopeId(node.id, job.id),
      localId: job.id,
      nodeId: node.id,
      nodeName: node.name,
      sessionId: scopeId(node.id, job.sessionId),
    };
  }

  private decorateSessionDetail(node: NodeDescriptor, detail: SessionDetail, eventCursor: number): SessionDetailView {
    return {
      session: this.decorateSession(node, detail.session),
      messages: detail.messages.map((message) => this.decorateMessage(node, message)),
      approvals: detail.approvals.map((approval) => this.decorateApproval(node, approval)),
      queue: detail.queue.map((job) => this.decoratePromptJob(node, job)),
      eventCursor,
    };
  }

  private decorateCodexSession(node: NodeDescriptor, session: RemoteResumeSession): CodexSessionView {
    return {
      ...session,
      id: scopeId(node.id, session.id),
      localId: session.id,
      nodeId: node.id,
      nodeName: node.name,
      managedSessionId: session.managedSessionId ? scopeId(node.id, session.managedSessionId) : null,
    };
  }

  private decorateCodexPreview(node: NodeDescriptor, preview: RemotePreview): CodexPreviewView {
    return {
      ...preview,
      id: scopeId(node.id, preview.id),
      localId: preview.id,
      nodeId: node.id,
      nodeName: node.name,
      managedSessionId: preview.managedSessionId ? scopeId(node.id, preview.managedSessionId) : null,
    };
  }

  private requirePeer(nodeId: string): PeerRuntime {
    const peer = this.peers.get(nodeId);
    if (!peer) throw new Error(`Unknown node: ${nodeId}`);
    return peer;
  }

  private parseScopedId(id: string): { nodeId: string; localId: string } {
    const index = id.indexOf('::');
    if (index < 0) return { nodeId: LOCAL_NODE_ID, localId: id };
    const nodeId = id.slice(0, index);
    const localId = id.slice(index + 2);
    if (!nodeId || !localId) throw new Error(`Invalid scoped id: ${id}`);
    this.requirePeer(nodeId);
    return { nodeId, localId };
  }

  private async requireWorkspace(workspaceId: string): Promise<WorkspaceView> {
    const parsed = parseWorkspaceId(workspaceId);
    if (!parsed) throw new Error(`Invalid workspace: ${workspaceId}`);

    let workspace: WorkspaceView;
    if (parsed.nodeId === LOCAL_NODE_ID) {
      const root = this.config.workspace.roots[parsed.index];
      if (root !== parsed.path) throw new Error(`Unknown workspace: ${workspaceId}`);
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
    } else {
      const peer = this.requirePeer(parsed.nodeId);
      await this.ensureSnapshot(peer);
      const root = peer.snapshot?.workspaceRoots[parsed.index];
      if (root !== parsed.path) throw new Error(`Unknown workspace: ${workspaceId}`);
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

    if (!workspace.connected) throw new Error(`Workspace node is unavailable: ${workspace.nodeName}`);
    return workspace;
  }
}

class RemoteHubClient {
  constructor(
    private readonly peer: Settings['cluster']['peers'][number],
    private readonly fetchImpl: FetchImpl,
  ) {}

  async getStatus(): Promise<RemoteStatus> {
    return await this.get('/api/status', { scope: SCOPE_LOCAL }) as RemoteStatus;
  }

  async listSessions(cwd?: string): Promise<Session[]> {
    return await this.get('/api/sessions', {
      scope: SCOPE_LOCAL,
      ...(cwd ? { cwd } : {}),
    }) as Session[];
  }

  async createSession(input: {
    cwd: string;
    title?: string;
    config?: CodexSessionConfigPatch;
  }): Promise<Session> {
    return await this.post('/api/sessions', {
      cwd: input.cwd,
      title: input.title,
      config: input.config,
    }) as Session;
  }

  async adoptSession(input: {
    threadId: string;
    cwd: string;
    title?: string;
    config?: CodexSessionConfigPatch;
    importTranscript?: boolean;
  }): Promise<Session> {
    return await this.post('/api/sessions/adopt', {
      threadId: input.threadId,
      cwd: input.cwd,
      title: input.title,
      config: input.config,
      importTranscript: input.importTranscript,
    }) as Session;
  }

  async listCodexSessions(cwd: string, limit?: number): Promise<RemoteSessionsResponse> {
    return await this.get('/api/codex/sessions', {
      scope: SCOPE_LOCAL,
      cwd,
      ...(limit ? { limit: String(limit) } : {}),
    }) as RemoteSessionsResponse;
  }

  async previewCodexSession(threadId: string): Promise<RemotePreview> {
    return await this.get(`/api/codex/sessions/${encodeURIComponent(threadId)}/preview`, {
      scope: SCOPE_LOCAL,
    }) as RemotePreview;
  }

  async getSessionDetail(id: string): Promise<SessionDetail> {
    return await this.get(`/api/sessions/${encodeURIComponent(id)}`) as SessionDetail;
  }

  async renameSession(id: string, title: string): Promise<Session> {
    return await this.patch(`/api/sessions/${encodeURIComponent(id)}`, { title }) as Session;
  }

  async updateSessionConfig(id: string, config: CodexSessionConfigPatch): Promise<Session> {
    return await this.patch(`/api/sessions/${encodeURIComponent(id)}/config`, { config }) as Session;
  }

  async deleteSession(id: string): Promise<void> {
    await this.delete(`/api/sessions/${encodeURIComponent(id)}`);
  }

  async claimControl(id: string, input: ControlLeaseInput): Promise<Session> {
    return await this.patch(`/api/sessions/${encodeURIComponent(id)}/control`, input) as Session;
  }

  async releaseControl(id: string, ownerId?: string): Promise<Session> {
    const suffix = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
    return await this.delete(`/api/sessions/${encodeURIComponent(id)}/control${suffix}`) as Session;
  }

  async listMessages(id: string, limit?: number, afterId?: string): Promise<Message[]> {
    return await this.get(`/api/sessions/${encodeURIComponent(id)}/messages`, {
      ...(limit ? { limit: String(limit) } : {}),
      ...(afterId ? { afterId } : {}),
    }) as Message[];
  }

  async listPromptJobs(id: string, query: PromptJobQuery = {}): Promise<PromptJob[]> {
    return await this.get(`/api/sessions/${encodeURIComponent(id)}/queue`, {
      ...(query.limit ? { limit: String(query.limit) } : {}),
      ...(query.statuses ? { status: promptStatusQuery(query.statuses) } : {}),
    }) as PromptJob[];
  }

  async sendMessage(id: string, input: SendMessageInput): Promise<Message> {
    return await this.post(`/api/sessions/${encodeURIComponent(id)}/messages`, input) as Message;
  }

  async interrupt(id: string): Promise<void> {
    await this.post(`/api/sessions/${encodeURIComponent(id)}/interrupt`, {});
  }

  async listApprovals(query: ApprovalQuery = {}): Promise<Approval[]> {
    return await this.get('/api/approvals', {
      scope: SCOPE_LOCAL,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.limit ? { limit: String(query.limit) } : {}),
    }) as Approval[];
  }

  async resolveApproval(id: string, decision: string, controlType: ControlType): Promise<void> {
    await this.post(`/api/approvals/${encodeURIComponent(id)}/resolve`, { decision, controlType });
  }

  async listFiles(root: string, path: string): Promise<{
    root: string;
    current: string;
    relativePath: string;
    parentPath: string;
    entries: Array<{ name: string; path: string; relativePath: string }>;
  }> {
    return await this.get('/api/files', { root, path }) as {
      root: string;
      current: string;
      relativePath: string;
      parentPath: string;
      entries: Array<{ name: string; path: string; relativePath: string }>;
    };
  }

  async streamEvents(afterId: number, onEvent: (event: RemoteEvent) => void, signal: AbortSignal): Promise<void> {
    const url = this.url('/api/events', {
      scope: SCOPE_LOCAL,
      ...(afterId > 0 ? { afterId: String(afterId) } : {}),
    });
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.peer.accessToken}` },
      signal,
    });
    if (!response.ok) throw new Error(await parseRemoteError(response));
    if (!response.body) throw new Error('Remote event stream is missing a body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf('\n\n');
      while (index >= 0) {
        const frame = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const event = decodeSseFrame(frame) as RemoteEvent | null;
        if (event) onEvent(event);
        index = buffer.indexOf('\n\n');
      }
    }
  }

  private async get(path: string, query: Record<string, string> = {}): Promise<unknown> {
    return await this.call('GET', path, undefined, query);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return await this.call('POST', path, body);
  }

  private async patch(path: string, body: unknown): Promise<unknown> {
    return await this.call('PATCH', path, body);
  }

  private async delete(path: string): Promise<unknown> {
    return await this.call('DELETE', path);
  }

  private async call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, query: Record<string, string> = {}): Promise<unknown> {
    const response = await this.fetchImpl(this.url(path, query), {
      method,
      headers: {
        Authorization: `Bearer ${this.peer.accessToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await parseRemoteError(response));
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  private url(path: string, query: Record<string, string>): string {
    const url = new URL(path.replace(/^\/+/, ''), withTrailingSlash(this.peer.url));
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }
}

function workspacesFromSnapshot(node: NodeDescriptor, snapshot: RemoteStatus, connected: boolean, error: string | null): WorkspaceView[] {
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

function localWorkspaces(config: AppConfig, node: NodeDescriptor, homePath: string): WorkspaceView[] {
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

function localFilesPayload(roots: string[], root: string, path: string): {
  root: string;
  current: string;
  relativePath: string;
  parentPath: string;
  entries: Array<{ name: string; path: string; relativePath: string }>;
} {
  const selectedRoot = roots.find((item) => item === root || item === resolve(root));
  if (!selectedRoot) throw new Error('Unknown workspace root');
  const current = resolve(selectedRoot, path || '.');
  if (!current.startsWith(`${resolve(selectedRoot)}/`) && current !== resolve(selectedRoot)) {
    throw new Error('Path must be inside the selected workspace root');
  }
  if (!existsSync(current)) throw new Error(`Path does not exist: ${current}`);
  if (!statSync(current).isDirectory()) throw new Error(`Path is not a directory: ${current}`);
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

function normalizePayload(node: NodeDescriptor, payload: Record<string, unknown>): Record<string, unknown> {
  const next = structuredClone(payload) as Record<string, unknown>;
  if (next.session && typeof next.session === 'object' && !Array.isArray(next.session)) {
    next.session = decorateSessionRecord(node, next.session as Session);
  }
  if (next.message && typeof next.message === 'object' && !Array.isArray(next.message)) {
    next.message = decorateMessageRecord(node, next.message as Message);
  }
  if (next.approval && typeof next.approval === 'object' && !Array.isArray(next.approval)) {
    next.approval = decorateApprovalRecord(node, next.approval as Approval);
  }
  if (next.binding && typeof next.binding === 'object' && !Array.isArray(next.binding)) {
    next.binding = decorateBindingRecord(node, next.binding as ControlBinding);
  }
  return next;
}

function decorateSessionRecord(node: NodeDescriptor, session: Session): SessionView {
  return {
    ...session,
    id: scopeId(node.id, session.id),
    localId: session.id,
    nodeId: node.id,
    nodeName: node.name,
  };
}

function decorateMessageRecord(node: NodeDescriptor, message: Message): MessageView {
  return {
    ...message,
    id: scopeId(node.id, message.id),
    localId: message.id,
    nodeId: node.id,
    nodeName: node.name,
    sessionId: scopeId(node.id, message.sessionId),
  };
}

function decorateApprovalRecord(node: NodeDescriptor, approval: Approval): ApprovalView {
  return {
    ...approval,
    id: scopeId(node.id, approval.id),
    localId: approval.id,
    nodeId: node.id,
    nodeName: node.name,
    sessionId: scopeId(node.id, approval.sessionId),
  };
}

function decorateBindingRecord(node: NodeDescriptor, binding: ControlBinding): ControlBinding & { localId: string; nodeId: string; nodeName: string; sessionId: string } {
  return {
    ...binding,
    id: scopeId(node.id, binding.id),
    localId: binding.id,
    nodeId: node.id,
    nodeName: node.name,
    sessionId: scopeId(node.id, binding.sessionId),
  };
}

function scopeId(nodeId: string, id: string): string {
  return nodeId === LOCAL_NODE_ID ? id : `${nodeId}::${id}`;
}

function scopedAfterId(nodeId: string, id: string | undefined): string | undefined {
  if (!id) return undefined;
  const index = id.indexOf('::');
  return index >= 0 && id.slice(0, index) === nodeId ? id.slice(index + 2) : id;
}

function workspaceId(nodeId: string, path: string, index: number): string {
  return `${nodeId}::${index}::${path}`;
}

function parseWorkspaceId(id: string): { nodeId: string; index: number; path: string } | null {
  const first = id.indexOf('::');
  if (first < 0) return null;
  const second = id.indexOf('::', first + 2);
  if (second < 0) return null;
  const nodeId = id.slice(0, first);
  const indexText = id.slice(first + 2, second);
  const path = id.slice(second + 2);
  const index = Number(indexText);
  if (!nodeId || !path || !Number.isInteger(index) || index < 0) return null;
  return { nodeId, index, path };
}

function promptStatusQuery(statuses: PromptJobStatus[]): string {
  if (statuses.length === 2 && statuses.includes('queued') && statuses.includes('running')) return 'active';
  if (statuses.length === 1) return statuses[0]!;
  return 'all';
}

async function parseRemoteError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    return payload.error?.message || text || response.statusText;
  } catch {
    return text || response.statusText;
  }
}

function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
