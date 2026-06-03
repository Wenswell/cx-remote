import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import { WEB_CONTROL_TTL_MS } from '../controls/control-actions.js';
import './styles.css';

declare global {
  interface Window {
    __CX_TG_BASE_PATH__?: string;
  }
}

type JsonObject = Record<string, unknown>;

type SessionConfig = {
  model?: string;
  reasoningEffort?: string;
  permissionMode?: string;
  search?: boolean;
};

type Session = {
  id: string;
  localId: string;
  nodeId: string;
  nodeName: string;
  title: string;
  cwd: string;
  status: string;
  controlOwnerId: string | null;
  controlLabel: string | null;
  controlLeaseExpiresAt: number | null;
  codexThreadId: string | null;
  currentTurnId: string | null;
  lastError: string | null;
  config?: SessionConfig;
  createdAt: number;
  updatedAt: number;
};

type Message = {
  id: string;
  sessionId: string;
  role: string;
  kind?: string;
  content: string;
  metadata?: {
    queued?: boolean;
  };
};

type Approval = {
  id: string;
  type: string;
  toolName: string;
  input: unknown;
  status: string;
  decision: string | null;
};

type PromptJob = {
  text: string;
  status: string;
  source: string;
  createdAt: number;
};

type Workspace = {
  id: string;
  nodeId: string;
  nodeName: string;
  name: string;
  path: string;
  homePath: string;
  connected: boolean;
  error: string | null;
};

type DirectoryEntry = {
  name: string;
  relativePath: string;
};

type DirectoryListing = {
  workspaceId: string;
  nodeId: string;
  nodeName: string;
  homePath: string;
  current: string;
  relativePath: string;
  parentPath: string;
  entries: DirectoryEntry[];
};

type CodexResumeSession = {
  id: string;
  localId: string;
  nodeId: string;
  nodeName: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  originator: string;
  threadSource: string;
  managedSessionId: string | null;
};

type CodexPreviewMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

type CodexSessionPreview = CodexResumeSession & {
  messageCount: number;
  messages: CodexPreviewMessage[];
};

type CodexResumeSessionsResponse = {
  cwd: string;
  sessions: CodexResumeSession[];
};

type SessionDetail = {
  session: Session;
  messages: Message[];
  approvals: Approval[];
  queue: PromptJob[];
  eventCursor: number;
};

type StatusResponse = {
  homePath: string;
  eventCursor: number;
  nodes: Array<{
    id: string;
    name: string;
    local: boolean;
    connected: boolean;
    homePath: string;
    workspaceRoots: string[];
    error: string | null;
  }>;
  codexDefaults: SessionConfig;
  codexRuntimeDefaults: {
    model: string;
    reasoningEffort: string;
  };
  stats: {
    sessions: number;
    pendingApprovals: number;
    queuedPrompts: number;
  };
};

type HubEvent = {
  id?: number;
  type: string;
  payload?: JsonObject;
};

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

type ValueElement = HTMLElement & {
  value: string;
};

type ConfigValueElement = ValueElement & {
  disabled: boolean;
};

type ButtonElement = HTMLElement & {
  disabled: boolean;
};

type ToggleElement = HTMLElement & {
  checked: boolean;
  disabled: boolean;
};

type DialogElement = HTMLElement & {
  show: () => Promise<void>;
  hide: () => Promise<void>;
};

type AlertElement = HTMLElement & {
  show: () => Promise<void>;
};

const tokenFromUrl = new URLSearchParams(location.search).get('token') || '';
if (tokenFromUrl) clearTokenFromUrl();

const notifyPrefsKey = 'cx_tg_notify_sessions';
const refreshIconSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">',
  '<path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>',
  '<path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>',
  '</svg>',
].join('');
const refreshIconUrl = `data:image/svg+xml,${encodeURIComponent(refreshIconSvg)}`;

let clientId = localStorage.getItem('cx_tg_client_id');
if (!clientId) {
  clientId = crypto.randomUUID();
  localStorage.setItem('cx_tg_client_id', clientId);
}

const controlLabel = `Web ${clientId.slice(0, 8)}`;
const jsonHeaders = { 'Content-Type': 'application/json' };
const appBasePath = normalizeBasePath(window.__CX_TG_BASE_PATH__ || '');
const apiPath = {
  auth: appPath('/api/auth'),
  status: appPath('/api/status'),
  workspaces: appPath('/api/workspaces'),
  sessions: appPath('/api/sessions'),
  sessionsForCwd: (nodeId: string, cwd: string) => appPath(`/api/sessions?nodeId=${encodeURIComponent(nodeId)}&cwd=${encodeURIComponent(cwd)}`),
  adoptSession: appPath('/api/sessions/adopt'),
  codexSessions: (nodeId: string, cwd: string) => appPath(`/api/codex/sessions?nodeId=${encodeURIComponent(nodeId)}&cwd=${encodeURIComponent(cwd)}&limit=100`),
  codexSessionPreview: (nodeId: string, threadId: string) => appPath(`/api/codex/sessions/${encodeURIComponent(threadId)}/preview?nodeId=${encodeURIComponent(nodeId)}`),
  files: (workspaceId: string, path: string) => appPath(`/api/files?workspaceId=${encodeURIComponent(workspaceId)}&path=${encodeURIComponent(path)}`),
  session: (id: string, suffix = '') => appPath(`/api/sessions/${encodeURIComponent(id)}${suffix}`),
  approvals: (sessionId: string) => appPath(`/api/approvals?sessionId=${encodeURIComponent(sessionId)}&status=all&limit=50`),
  approvalResolve: (id: string) => appPath(`/api/approvals/${encodeURIComponent(id)}/resolve`),
  events: (sessionId: string | undefined, afterId: number | undefined) => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (afterId) params.set('afterId', String(afterId));
    const query = params.toString();
    return appPath(query ? `/api/events?${query}` : '/api/events');
  },
};

let activeSessionId = localStorage.getItem('cx_tg_session') || '';
let currentWorkspaceId = localStorage.getItem('cx_tg_workspace') || '';
let sessions: Session[] = [];
let pathSessions: Session[] = [];
let adoptSessions: CodexResumeSession[] = [];
let messages: Message[] = [];
let pendingApprovals: Approval[] = [];
let approvalHistory: Approval[] = [];
let promptQueue: PromptJob[] = [];
let workspaces: Workspace[] = [];
let currentSession: Session | null = null;
let codexDefaults: SessionConfig = {};
let currentPath = '';
let homePath = '';
const homePathByNode = new Map<string, string>();
let streamBuffer = '';
let eventSource: EventSource | null = null;
let eventSourceSessionId = '';
let notificationEventSource: EventSource | null = null;
let notificationEventCursor = 0;
let pendingDeleteSessionId = '';
let pendingAdoptSession: CodexResumeSession | null = null;
let pendingAdoptPreview: CodexSessionPreview | null = null;
let pathSessionsLoading = false;
let pathSessionsRequestId = 0;
const eventCursorBySession = new Map<string, number>();
const busyControls = new WeakSet<HTMLElement>();

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

element('refresh-icon').setAttribute('src', refreshIconUrl);
element('refresh-path-sessions-icon').setAttribute('src', refreshIconUrl);

async function ensureAuth(): Promise<void> {
  const current = await fetch(apiPath.status, { credentials: 'same-origin' });
  if (current.ok) return;
  const token = tokenFromUrl || prompt('Access token') || '';
  const response = await fetch(apiPath.auth, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await parseAuthError(response));
}

async function parseAuthError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    return payload.error?.message || text || response.statusText;
  } catch {
    return text || response.statusText;
  }
}

function clearTokenFromUrl(): void {
  const url = new URL(location.href);
  url.searchParams.delete('token');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function displayPath(path: string, nodeId?: string): string {
  const base = homePathByNode.get(nodeId || currentWorkspace()?.nodeId || 'local') || homePath;
  return base && (path === base || path.startsWith(`${base}/`)) ? `~${path.slice(base.length)}` : path;
}

function truncateText(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function appPath(path: string): string {
  return `${appBasePath}${path}`;
}

function normalizeBasePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '/' ? '' : trimmed;
}

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...jsonHeaders, ...(options.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } };
      throw new Error(payload.error?.message || text);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text || response.statusText);
      throw error;
    }
  }
  if (response.headers.get('content-type')?.includes('application/json') && text) {
    return JSON.parse(text) as T;
  }
  return text as T;
}

async function loadAll(): Promise<void> {
  const status = await api<StatusResponse>(apiPath.status);
  homePath = status.homePath;
  homePathByNode.clear();
  status.nodes.forEach((node) => {
    if (node.homePath) homePathByNode.set(node.id, node.homePath);
  });
  codexDefaults = status.codexDefaults || {};
  setRuntimeDefaultLabels(status.codexRuntimeDefaults);
  setRuntimeControls('new', codexDefaults);
  rememberNotificationEventCursor(status.eventCursor);
  element('status').textContent = `${status.stats.sessions} managed sessions · ${status.stats.pendingApprovals} approvals · ${status.stats.queuedPrompts} queued`;
  sessions = await api<Session[]>(apiPath.sessions);
  if (activeSessionId && !sessions.some((session) => session.id === activeSessionId)) activeSessionId = '';
  if (!activeSessionId && sessions[0]) activeSessionId = sessions[0].id;
  renderRecentSessions();
  await loadWorkspaces();
  renderPathSessions();
  await loadSession();
  syncNotificationEvents();
}

async function loadWorkspaces(): Promise<void> {
  workspaces = await api<Workspace[]>(apiPath.workspaces);
  if (!workspaces.length) return;
  if (!workspaces.some((workspace) => workspace.id === currentWorkspaceId)) currentWorkspaceId = workspaces[0]!.id;
  localStorage.setItem('cx_tg_workspace', currentWorkspaceId);
  renderWorkspaceRoots();
  await loadDirs(currentPath);
}

function renderWorkspaceRoots(): void {
  const select = element<ValueElement>('workspace-root');
  select.innerHTML = '';
  for (const workspace of workspaces) {
    const option = document.createElement('sl-option');
    option.setAttribute('value', workspace.id);
    option.textContent = `${workspace.nodeName} · ${workspace.name} · ${displayPath(workspace.path, workspace.nodeId)}`;
    select.appendChild(option);
  }
  if (workspaces.length === 1) {
    select.hidden = true;
    return;
  }
  select.hidden = false;
  select.value = currentWorkspaceId;
}

async function loadDirs(path: string): Promise<void> {
  const workspace = currentWorkspace();
  if (!workspace) return;
  const data = await api<DirectoryListing>(apiPath.files(workspace.id, path));
  currentWorkspaceId = data.workspaceId;
  localStorage.setItem('cx_tg_workspace', currentWorkspaceId);
  currentPath = data.relativePath || '';
  element<ValueElement>('cwd').value = data.current;
  renderDirs(data);
  await loadPathSessionChoices(data.current, data.nodeId);
}

function renderDirs(data: DirectoryListing): void {
  const box = element('dirs');
  box.innerHTML = '';
  if (data.relativePath) {
    box.appendChild(createButton('..', {
      size: 'small',
      className: 'dir-button',
      onClick: () => loadDirs(data.parentPath),
    }));
  }
  for (const entry of data.entries) {
    box.appendChild(createButton(entry.name, {
      size: 'small',
      className: 'dir-button',
      onClick: () => loadDirs(entry.relativePath),
    }));
  }
  if (!box.childElementCount) box.appendChild(emptyState('No child directories'));
}

async function loadPathSessionChoices(cwd = element<ValueElement>('cwd').value.trim(), nodeId = currentWorkspace()?.nodeId): Promise<void> {
  if (!cwd || !nodeId) {
    pathSessions = [];
    adoptSessions = [];
    renderPathSessions();
    return;
  }

  const requestId = ++pathSessionsRequestId;
  pathSessionsLoading = true;
  renderPathSessions();
  try {
    const [hubSessions, codexSessions] = await Promise.all([
      api<Session[]>(apiPath.sessionsForCwd(nodeId, cwd)),
      api<CodexResumeSessionsResponse>(apiPath.codexSessions(nodeId, cwd)),
    ]);
    if (
      requestId !== pathSessionsRequestId
      || element<ValueElement>('cwd').value.trim() !== codexSessions.cwd
      || currentWorkspace()?.nodeId !== nodeId
    ) return;
    pathSessions = hubSessions;
    adoptSessions = codexSessions.sessions;
  } finally {
    if (requestId === pathSessionsRequestId) {
      pathSessionsLoading = false;
      renderPathSessions();
    }
  }
}

function formatDateTime(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function currentWorkspace(): Workspace | undefined {
  return workspaces.find((workspace) => workspace.id === currentWorkspaceId);
}

async function loadSession(): Promise<void> {
  if (!activeSessionId) {
    closeEvents();
    currentSession = null;
    messages = [];
    pendingApprovals = [];
    approvalHistory = [];
    promptQueue = [];
    streamBuffer = '';
    renderSession();
    return;
  }
  const sessionId = activeSessionId;
  const switchingSession = currentSession?.id !== sessionId;
  if (switchingSession) streamBuffer = '';
  const data = await api<SessionDetail>(apiPath.session(sessionId));
  if (sessionId !== activeSessionId) return;
  currentSession = data.session;
  syncSessionLists(data.session);
  messages = data.messages;
  pendingApprovals = data.approvals;
  promptQueue = data.queue || [];
  rememberEventCursor(sessionId, data.eventCursor);
  approvalHistory = await api<Approval[]>(apiPath.approvals(sessionId));
  if (sessionId !== activeSessionId) return;
  renderSession();
  connectEvents(sessionId);
}

function syncSessionLists(session: Session): void {
  sessions = upsertSession(sessions, session, true);
  const workspace = currentWorkspace();
  pathSessions = upsertSession(pathSessions, session, Boolean(
    workspace
    && session.nodeId === workspace.nodeId
    && session.cwd === element<ValueElement>('cwd').value.trim(),
  ));
  renderRecentSessions();
  renderPathSessions();
}

function upsertSession(list: Session[], session: Session, include: boolean): Session[] {
  const withoutSession = list.filter((item) => item.id !== session.id);
  if (!include) return withoutSession;
  return [session, ...withoutSession].sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderRecentSessions(): void {
  const container = element('recent-sessions');
  container.innerHTML = '';
  if (!sessions.length) {
    container.appendChild(emptyState('No Hub sessions'));
    return;
  }
  for (const session of sessions) container.appendChild(hubSessionButton(session, true));
}

function renderPathSessions(): void {
  const container = element('path-sessions');
  container.innerHTML = '';
  if (pathSessionsLoading) {
    container.appendChild(emptyState('Loading sessions'));
    return;
  }

  const unmanagedCodexSessions = adoptSessions.filter((session) => !session.managedSessionId);
  if (!pathSessions.length && !unmanagedCodexSessions.length) {
    container.appendChild(emptyState('No sessions in this directory'));
    return;
  }

  if (pathSessions.length) {
    container.appendChild(sectionLabel('Hub-managed'));
    for (const session of pathSessions) container.appendChild(hubSessionButton(session, false));
  }

  if (unmanagedCodexSessions.length) {
    container.appendChild(sectionLabel('Codex resume'));
    for (const session of unmanagedCodexSessions) container.appendChild(codexSessionButton(session));
  }
}

function hubSessionButton(session: Session, showPath: boolean): ButtonElement {
  const button = createButton('', {
    className: `session${session.id === activeSessionId ? ' active' : ''}`,
    size: 'small',
    onClick: () => selectHubSession(session),
  });
  const line = document.createElement('span');
  line.className = 'session-line';
  const name = document.createElement('span');
  name.className = 'session-name';
  name.textContent = session.title;
  line.append(name, statusBadge(session.status));
  const meta = document.createElement('span');
  meta.className = 'session-path muted';
  meta.textContent = showPath
    ? [session.nodeName, displayPath(session.cwd, session.nodeId)].filter(Boolean).join(' · ')
    : [`Updated ${formatDateTime(session.updatedAt)}`, shortId(session.localId)].filter(Boolean).join(' · ');
  button.append(line, meta);
  return button;
}

function codexSessionButton(session: CodexResumeSession): ButtonElement {
  const button = createButton('', {
    className: 'session codex-session',
    size: 'small',
    onClick: () => showAdoptPreview(session),
  });
  const line = document.createElement('span');
  line.className = 'session-line';
  const name = document.createElement('span');
  name.className = 'session-name';
  name.textContent = session.title;
  const action = document.createElement('span');
  action.className = 'session-action';
  action.textContent = 'Adopt';
  line.append(name, action);
  const meta = document.createElement('span');
  meta.className = 'session-path muted';
  meta.textContent = [
    session.nodeName,
    `Updated ${formatDateTime(session.updatedAt)}`,
    shortId(session.localId),
    session.originator || '',
  ].filter(Boolean).join(' · ');
  button.append(line, meta);
  return button;
}

function sectionLabel(text: string): HTMLElement {
  const label = document.createElement('div');
  label.className = 'section-label muted';
  label.textContent = text;
  return label;
}

async function selectHubSession(session: Session): Promise<void> {
  activeSessionId = session.id;
  localStorage.setItem('cx_tg_session', activeSessionId);
  await syncWorkspaceToSession(session);
  renderRecentSessions();
  renderPathSessions();
  await loadSession();
  closeSidebarOnMobile();
}

async function showAdoptPreview(codexSession: CodexResumeSession): Promise<void> {
  const preview = await api<CodexSessionPreview>(apiPath.codexSessionPreview(codexSession.nodeId, codexSession.localId));
  if (preview.managedSessionId) throw new Error(`Codex thread is already managed by Hub session: ${preview.managedSessionId}`);
  pendingAdoptSession = codexSession;
  pendingAdoptPreview = preview;
  renderAdoptPreview(preview);
  await element<DialogElement>('adopt-dialog').show();
}

function renderAdoptPreview(preview: CodexSessionPreview): void {
  element('adopt-title').textContent = preview.title;
  element('adopt-meta').textContent = [
    preview.nodeName,
    displayPath(preview.cwd, preview.nodeId),
    `Updated ${formatDateTime(preview.updatedAt)}`,
    shortId(preview.localId),
    `${preview.messageCount} messages`,
  ].filter(Boolean).join(' · ');

  const list = element('adopt-preview-messages');
  list.innerHTML = '';
  if (!preview.messages.length) {
    list.appendChild(emptyState('No transcript messages'));
    return;
  }
  for (const message of preview.messages) list.appendChild(previewMessageNode(message));
}

function previewMessageNode(message: CodexPreviewMessage): HTMLElement {
  const div = document.createElement('div');
  div.className = `preview-msg ${message.role}`;
  const meta = document.createElement('div');
  meta.className = 'preview-msg-meta';
  meta.textContent = `${message.role} · ${formatDateTime(message.createdAt)}`;
  const content = document.createElement('div');
  content.className = 'preview-msg-content';
  content.textContent = message.content;
  div.append(meta, content);
  return div;
}

function clearAdoptPreview(): void {
  pendingAdoptSession = null;
  pendingAdoptPreview = null;
  element('adopt-preview-messages').innerHTML = '';
}

async function adoptPendingCodexSession(): Promise<void> {
  if (!pendingAdoptSession || !pendingAdoptPreview) return;
  const session = await api<Session>(apiPath.adoptSession, {
    method: 'POST',
    body: JSON.stringify({
      nodeId: pendingAdoptSession.nodeId,
      threadId: pendingAdoptSession.localId,
      cwd: pendingAdoptPreview.cwd,
      title: pendingAdoptPreview.title,
      importTranscript: true,
      config: runtimeConfigFromControls('new'),
    }),
  });
  activeSessionId = session.id;
  localStorage.setItem('cx_tg_session', activeSessionId);
  await element<DialogElement>('adopt-dialog').hide();
  clearAdoptPreview();
  await loadAll();
  closeSidebarOnMobile();
}

function renderSession(): void {
  if (!currentSession) {
    element('session-title').textContent = 'No Hub session';
    element('session-meta').textContent = 'Create a managed session or adopt an existing Codex thread.';
    element('session-detail').innerHTML = '';
  } else {
    renderSessionHeader();
  }
  renderMessages();
  renderPromptQueue();
  renderApprovals();
  renderActionState();
}

function renderSessionHeader(): void {
  if (!currentSession) return;
  const config = currentSession.config || {};
  element('session-title').textContent = currentSession.title;
  element('session-meta').textContent = `${currentSession.nodeName} · ${displayPath(currentSession.cwd, currentSession.nodeId)}`;

  const detail = element('session-detail');
  detail.innerHTML = '';
  const chips = document.createElement('div');
  chips.className = 'meta-row';
  [
    ['node', currentSession.nodeName],
    ['status', currentSession.status],
    ['control', currentSession.controlLabel || 'shared'],
    ['model', config.model || '-'],
    ['permission', config.permissionMode || '-'],
    ['search', config.search ? 'on' : 'off'],
  ].forEach(([label, value]) => chips.appendChild(metaChip(label, value)));
  detail.appendChild(chips);

  const runtime = [
    ['Hub session', shortId(currentSession.localId)],
    ['Codex thread', shortId(currentSession.codexThreadId)],
    ['Codex turn', shortId(currentSession.currentTurnId)],
    ['lease', currentSession.controlLeaseExpiresAt ? new Date(currentSession.controlLeaseExpiresAt).toLocaleTimeString() : ''],
    ['error', currentSession.lastError || ''],
  ].filter(([, value]) => value);
  if (runtime.length) {
    const line = document.createElement('div');
    line.className = 'runtime-line';
    line.textContent = runtime.map(([label, value]) => `${label} ${value}`).join(' · ');
    detail.appendChild(line);
  }
}

function metaChip(label: string, value: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'meta-chip';
  const key = document.createElement('strong');
  key.textContent = `${label} `;
  chip.append(key, String(value));
  return chip;
}

function shortId(value: string | null): string {
  return value ? value.slice(0, 8) : '';
}

async function syncWorkspaceToSession(session: Session): Promise<void> {
  const matches = workspaces
    .filter((workspace) => workspace.nodeId === session.nodeId)
    .filter((workspace) => session.cwd === workspace.path || session.cwd.startsWith(`${workspace.path}/`))
    .sort((a, b) => b.path.length - a.path.length);
  const workspace = matches[0];
  if (!workspace) return;
  if (currentWorkspaceId !== workspace.id) {
    currentWorkspaceId = workspace.id;
    localStorage.setItem('cx_tg_workspace', currentWorkspaceId);
  }
  const relativePath = session.cwd === workspace.path ? '' : session.cwd.slice(workspace.path.length + 1);
  await loadDirs(relativePath);
}

function renderActionState(): void {
  const hasSession = Boolean(currentSession);
  const isControlledByMe = currentSession?.controlOwnerId === clientId;
  const isControlledByOther = Boolean(currentSession?.controlOwnerId && !isControlledByMe);
  const isRunning = currentSession?.status === 'running' || currentSession?.status === 'waiting_approval';
  const hasActiveWork = Boolean(isRunning) || promptQueue.length > 0;

  element<ButtonElement>('rename').disabled = !hasSession;
  element<ButtonElement>('runtime').disabled = !hasSession || hasActiveWork;
  element<ButtonElement>('delete').disabled = !hasSession;
  const notify = element<ToggleElement>('notify');
  notify.hidden = !hasSession;
  notify.disabled = !hasSession;
  notify.checked = Boolean(currentSession && sessionNotificationsEnabled(currentSession.id));

  const claim = element<ButtonElement>('claim');
  claim.hidden = !hasSession || isControlledByMe;
  claim.disabled = !hasSession || isControlledByOther;
  setButtonLabel(claim, isControlledByOther ? `Controlled by ${currentSession?.controlLabel || 'another client'}` : 'Take control');

  const release = element<ButtonElement>('release');
  release.hidden = !hasSession || !isControlledByMe;
  release.disabled = !isControlledByMe;

  const stop = element<ButtonElement>('stop');
  stop.hidden = !hasSession || !hasActiveWork;
  stop.disabled = !hasActiveWork;
}

function renderMessages(): void {
  const box = element('messages');
  box.innerHTML = '';
  for (const message of messages) box.appendChild(messageNode(message));
  if (streamBuffer) box.appendChild(streamingNode());
  box.scrollTop = box.scrollHeight;
}

function messageNode(message: Message): HTMLElement {
  const div = document.createElement('div');
  div.className = `msg ${message.role}${message.kind === 'error' ? ' error' : ''}`;
  div.append(messageMeta(message.role, Boolean(message.metadata?.queued)), messageContent(message.content));
  return div;
}

function streamingNode(): HTMLElement {
  const div = document.createElement('div');
  div.id = 'streaming-message';
  div.className = 'msg assistant streaming';
  div.append(messageMeta('assistant', false), messageContent(streamBuffer));
  return div;
}

function appendDelta(delta: string): void {
  streamBuffer += delta;
  let div = document.getElementById('streaming-message');
  if (!div) {
    div = streamingNode();
    element('messages').appendChild(div);
  } else {
    const content = div.querySelector('.msg-content');
    if (content) content.textContent = streamBuffer;
  }
  const box = element('messages');
  box.scrollTop = box.scrollHeight;
}

function messageMeta(role: string, queued: boolean): HTMLElement {
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const badge = document.createElement('sl-badge');
  badge.className = 'role-badge role-main';
  badge.setAttribute('variant', role === 'user' ? 'primary' : role === 'assistant' ? 'success' : 'neutral');
  badge.textContent = role;
  meta.appendChild(badge);
  if (queued) {
    const queuedBadge = document.createElement('sl-badge');
    queuedBadge.className = 'role-badge queued-badge';
    queuedBadge.setAttribute('variant', 'neutral');
    queuedBadge.textContent = 'queued';
    meta.appendChild(queuedBadge);
  }
  return meta;
}

function messageContent(text: string): HTMLElement {
  const content = document.createElement('div');
  content.className = 'msg-content';
  content.textContent = text;
  return content;
}

function renderApprovals(): void {
  const resolved = approvalHistory.filter((approval) => approval.status !== 'pending');
  const section = element('approvals');
  section.hidden = pendingApprovals.length === 0 && resolved.length === 0;
  renderApprovalList(element('pending-approvals'), pendingApprovals, true);
  const history = element('approval-history-details');
  history.hidden = resolved.length === 0;
  renderApprovalList(element('approval-history'), resolved, false);
}

function renderPromptQueue(): void {
  const container = element('prompt-queue');
  container.innerHTML = '';
  container.hidden = promptQueue.length === 0;
  if (!promptQueue.length) return;
  const title = document.createElement('div');
  title.className = 'muted';
  title.textContent = 'Prompt queue';
  container.appendChild(title);
  promptQueue.forEach((job, index) => {
    const div = document.createElement('div');
    div.className = `queue-job ${job.status}`;
    const head = document.createElement('div');
    head.textContent = `#${index + 1} · ${job.status} · ${job.source} · ${new Date(job.createdAt).toLocaleString()}`;
    const pre = document.createElement('pre');
    pre.textContent = job.text;
    div.append(head, pre);
    container.appendChild(div);
  });
}

function renderApprovalList(container: HTMLElement, approvals: Approval[], pending: boolean): void {
  container.innerHTML = '';
  container.hidden = approvals.length === 0;
  if (!approvals.length) return;
  const title = document.createElement('div');
  title.className = 'muted';
  title.textContent = pending ? 'Pending approvals' : 'Approval history';
  container.appendChild(title);
  for (const approval of approvals) {
    const div = document.createElement('div');
    div.className = `approval${pending ? '' : ' resolved'}`;
    const head = document.createElement('div');
    head.textContent = `${approval.toolName} · ${approval.status}${approval.decision ? ` · ${approval.decision}` : ''}`;
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(approval.input, null, 2);
    div.append(head, pre);
    if (pending) {
      const row = document.createElement('div');
      row.className = 'row';
      row.append(
        createButton(approval.type === 'choice' ? 'Choose 1' : 'Allow', {
          variant: 'primary',
          onClick: () => resolveApproval(approval.id, approval.type === 'choice' ? '0' : 'approved'),
        }),
        createButton(approval.type === 'choice' ? 'Cancel' : 'Deny', {
          variant: 'danger',
          onClick: () => resolveApproval(approval.id, approval.type === 'choice' ? 'cancel' : 'denied'),
        }),
      );
      div.appendChild(row);
    }
    container.appendChild(div);
  }
}

async function resolveApproval(id: string, decision: string): Promise<void> {
  await api(apiPath.approvalResolve(id), {
    method: 'POST',
    body: JSON.stringify({ decision, controlType: 'web' }),
  });
  await loadSession();
}

function rememberEventCursor(sessionId: string, value: unknown): void {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return;
  const current = eventCursorBySession.get(sessionId) || 0;
  if (id > current) eventCursorBySession.set(sessionId, id);
}

function rememberNotificationEventCursor(value: unknown): void {
  const id = Number(value);
  if (Number.isFinite(id) && id > notificationEventCursor) notificationEventCursor = id;
}

function closeEvents(): void {
  if (eventSource) eventSource.close();
  eventSource = null;
  eventSourceSessionId = '';
}

function closeNotificationEvents(): void {
  if (notificationEventSource) notificationEventSource.close();
  notificationEventSource = null;
}

function connectEvents(sessionId: string): void {
  if (eventSource && eventSourceSessionId === sessionId) return;
  closeEvents();
  eventSourceSessionId = sessionId;
  const url = apiPath.events(sessionId, eventCursorBySession.get(sessionId));
  eventSource = new EventSource(url, { withCredentials: true });
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data) as HubEvent;
    rememberEventCursor(sessionId, event.lastEventId || data.id);
    if (sessionId !== activeSessionId) return;
    if (data.type === 'ready') return;
    if (data.type === 'message.delta') {
      appendDelta(String(data.payload?.delta || ''));
      return;
    }
    if (data.type === 'session.deleted') {
      activeSessionId = '';
      localStorage.removeItem('cx_tg_session');
      closeEvents();
      run(loadAll());
      return;
    }
    if (data.type === 'message.created') {
      const message = data.payload?.message as Message | undefined;
      if (message?.id && !messages.some((item) => item.id === message.id)) {
        messages.push(message);
        if (message.role === 'assistant') streamBuffer = '';
        renderMessages();
        return;
      }
    }
    if (['approval.created', 'approval.resolved', 'session.control.updated'].includes(data.type)
      || (data.type === 'session.updated' && data.payload?.queuedPrompts !== undefined)) {
      run(loadSession());
    }
  };
  eventSource.onerror = () => showError(new Error('Event stream disconnected'));
}

function syncNotificationEvents(): void {
  const enabled = sessions.some((session) => sessionNotificationsEnabled(session.id));
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') {
    closeNotificationEvents();
    return;
  }
  if (notificationEventSource) return;
  notificationEventSource = new EventSource(apiPath.events(undefined, notificationEventCursor), { withCredentials: true });
  notificationEventSource.onmessage = (event) => {
    const data = JSON.parse(event.data) as HubEvent;
    rememberNotificationEventCursor(event.lastEventId || data.id);
    if (data.type !== 'message.created') return;
    const message = data.payload?.message as Message | undefined;
    if (message?.id) notifyAssistantMessage(message);
  };
  notificationEventSource.onerror = () => showError(new Error('Notification event stream disconnected'));
}

function createButton(
  label: string,
  options: {
    className?: string;
    icon?: string;
    size?: 'small' | 'medium' | 'large';
    variant?: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' | 'text' | 'default';
    onClick: () => Promise<void> | void;
  },
): ButtonElement {
  const button = document.createElement('sl-button') as ButtonElement;
  button.setAttribute('type', 'button');
  if (options.className) button.className = options.className;
  if (options.size) button.setAttribute('size', options.size);
  if (options.variant) button.setAttribute('variant', options.variant);
  if (options.icon) {
    const icon = document.createElement('sl-icon');
    icon.setAttribute('slot', 'prefix');
    icon.setAttribute('library', 'system');
    icon.setAttribute('name', options.icon);
    button.appendChild(icon);
  }
  if (label) button.append(label);
  button.addEventListener('click', () => runAction(button, options.onClick));
  return button;
}

function statusBadge(value: string): HTMLElement {
  const badge = document.createElement('sl-badge');
  badge.setAttribute('variant', value === 'idle' ? 'neutral' : 'primary');
  badge.textContent = value;
  return badge;
}

function emptyState(text: string): HTMLElement {
  const empty = document.createElement('div');
  empty.className = 'muted';
  empty.textContent = text;
  return empty;
}

function notificationPrefs(): Record<string, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem(notifyPrefsKey) || '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function sessionNotificationsEnabled(sessionId: string): boolean {
  return notificationPrefs()[sessionId] === true;
}

function setSessionNotifications(sessionId: string, enabled: boolean): void {
  const prefs = notificationPrefs();
  if (enabled) {
    prefs[sessionId] = true;
  } else {
    delete prefs[sessionId];
  }
  localStorage.setItem(notifyPrefsKey, JSON.stringify(prefs));
}

async function ensureNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) throw new Error('Browser notifications are unavailable');
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') throw new Error('Browser notifications are blocked');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Browser notification permission was not granted');
}

async function updateSessionNotifications(enabled: boolean): Promise<void> {
  const sessionId = currentSession?.id;
  if (!sessionId) return;
  try {
    if (enabled) {
      await ensureNotificationPermission();
      await refreshNotificationCursor();
    }
    setSessionNotifications(sessionId, enabled);
  } finally {
    renderActionState();
    syncNotificationEvents();
  }
}

function notifyAssistantMessage(message: Message): void {
  if (message.role !== 'assistant' || !message.content.trim()) return;
  if (!sessionNotificationsEnabled(message.sessionId)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(sessionTitle(message.sessionId), {
    body: truncateText(message.content.trim(), 180),
    tag: `cx-tg-${message.sessionId}`,
  });
}

async function refreshNotificationCursor(): Promise<void> {
  const status = await api<StatusResponse>(apiPath.status);
  homePath = status.homePath;
  status.nodes.forEach((node) => {
    if (node.homePath) homePathByNode.set(node.id, node.homePath);
  });
  rememberNotificationEventCursor(status.eventCursor);
}

function sessionTitle(sessionId: string): string {
  const session = sessions.find((item) => item.id === sessionId) || currentSession;
  return session ? `${session.nodeName} · ${session.title}` : 'CX TG';
}

function setButtonLabel(button: HTMLElement, label: string): void {
  const icon = button.querySelector('sl-icon');
  button.textContent = '';
  if (icon) button.appendChild(icon);
  button.append(label);
}

function showDeleteDialog(session: Session): void {
  pendingDeleteSessionId = session.id;
  element('delete-dialog-message').textContent = `Delete Hub session ${session.title}?`;
  run(element<DialogElement>('delete-dialog').show());
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  element('error-message').textContent = message;
  run(element<AlertElement>('error-alert').show());
}

function run(promise: Promise<unknown>): void {
  promise.catch(showError);
}

function runAction(control: HTMLElement, action: () => Promise<unknown> | unknown): void {
  if (busyControls.has(control)) return;
  busyControls.add(control);
  setControlBusy(control, true);
  Promise.resolve()
    .then(action)
    .catch(showError)
    .finally(() => {
      busyControls.delete(control);
      setControlBusy(control, false);
      renderActionState();
    });
}

function setControlBusy(control: HTMLElement, busy: boolean): void {
  control.toggleAttribute('aria-busy', busy);
  if ('disabled' in control) (control as ButtonElement).disabled = busy;
}

function submitButton(form: HTMLFormElement): HTMLElement {
  return form.querySelector('sl-button[type="submit"]') as HTMLElement || form;
}

function setRuntimeControls(prefix: 'new' | 'runtime', config: SessionConfig): void {
  element<ToggleElement>(`${prefix}-search`).checked = config.search === true;
  element<ConfigValueElement>(`${prefix}-permission-mode`).value = config.permissionMode || 'default';
  const model = document.getElementById(`${prefix}-model`) as ConfigValueElement | null;
  const reasoningEffort = document.getElementById(`${prefix}-reasoning-effort`) as ConfigValueElement | null;
  if (model) model.value = config.model || 'auto';
  if (reasoningEffort) reasoningEffort.value = config.reasoningEffort || 'default';
}

function setRuntimeDefaultLabels(defaults: StatusResponse['codexRuntimeDefaults']): void {
  (['new', 'runtime'] as const).forEach((prefix) => {
    setSelectOptionLabel(`${prefix}-model`, 'auto', `Default(${defaults.model})`);
    setSelectOptionLabel(`${prefix}-reasoning-effort`, 'default', `Default(${defaults.reasoningEffort})`);
  });
}

function setSelectOptionLabel(selectId: string, value: string, label: string): void {
  const option = document.querySelector(`#${selectId} sl-option[value="${value}"]`);
  if (option) option.textContent = label;
}

function runtimeConfigFromControls(prefix: 'new' | 'runtime'): SessionConfig {
  const config: SessionConfig = {
    search: element<ToggleElement>(`${prefix}-search`).checked,
    permissionMode: element<ConfigValueElement>(`${prefix}-permission-mode`).value,
  };
  const model = document.getElementById(`${prefix}-model`) as ConfigValueElement | null;
  const reasoningEffort = document.getElementById(`${prefix}-reasoning-effort`) as ConfigValueElement | null;
  if (model) config.model = model.value;
  if (reasoningEffort) config.reasoningEffort = reasoningEffort.value;
  return config;
}

function openRuntimeDialog(session: Session): void {
  setRuntimeControls('runtime', session.config || {});
  run(element<DialogElement>('runtime-dialog').show());
}

async function saveRuntimeConfig(): Promise<void> {
  if (!currentSession) return;
  await api(apiPath.session(currentSession.id, '/config'), {
    method: 'PATCH',
    body: JSON.stringify({ config: runtimeConfigFromControls('runtime') }),
  });
  await element<DialogElement>('runtime-dialog').hide();
  await loadAll();
}

function setSidebarOpen(open: boolean): void {
  document.body.classList.toggle('sidebar-open', open);
}

function closeSidebarOnMobile(): void {
  if (window.matchMedia('(max-width: 760px)').matches) setSidebarOpen(false);
}

element<ValueElement>('workspace-root').addEventListener('sl-change', (event) => {
  currentWorkspaceId = (event.currentTarget as ValueElement).value;
  currentPath = '';
  localStorage.setItem('cx_tg_workspace', currentWorkspaceId);
  run(loadDirs(''));
});
element('root-dir').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => loadDirs('')));
element('refresh').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, loadAll));
element('refresh-path-sessions').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => loadPathSessionChoices()));
element('sidebar-toggle').addEventListener('click', () => setSidebarOpen(true));
element('sidebar-close').addEventListener('click', () => setSidebarOpen(false));
element('sidebar-backdrop').addEventListener('click', () => setSidebarOpen(false));
element('claim').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  if (!currentSession) return;
  await api(apiPath.session(currentSession.id, '/control'), {
    method: 'PATCH',
    body: JSON.stringify({ controlType: 'web', ownerId: clientId, controlLabel, ttlMs: WEB_CONTROL_TTL_MS }),
  });
  await loadSession();
}));
element('release').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  if (!currentSession) return;
  await api(apiPath.session(currentSession.id, `/control?ownerId=${encodeURIComponent(clientId)}`), { method: 'DELETE' });
  await loadSession();
}));
element('stop').addEventListener('click', (event) => {
  runAction(event.currentTarget as HTMLElement, async () => {
    if (activeSessionId) await api(apiPath.session(activeSessionId, '/interrupt'), { method: 'POST' }).then(loadAll);
  });
});
element('rename').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  if (!currentSession) return;
  const title = prompt('Title', currentSession.title);
  if (!title) return;
  await api(apiPath.session(currentSession.id), {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  await loadAll();
}));
element('runtime').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => {
  if (currentSession) openRuntimeDialog(currentSession);
}));
element('delete').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => {
  if (currentSession) showDeleteDialog(currentSession);
}));
element<ToggleElement>('notify').addEventListener('sl-change', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  await updateSessionNotifications((event.currentTarget as ToggleElement).checked);
}));
element('delete-cancel').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => element<DialogElement>('delete-dialog').hide()));
element('adopt-cancel').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  await element<DialogElement>('adopt-dialog').hide();
  clearAdoptPreview();
}));
element('adopt-confirm').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, adoptPendingCodexSession));
element('adopt-dialog').addEventListener('sl-hide', () => clearAdoptPreview());
element('runtime-cancel').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, () => element<DialogElement>('runtime-dialog').hide()));
element('runtime-save').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, saveRuntimeConfig));
element('delete-confirm').addEventListener('click', (event) => runAction(event.currentTarget as HTMLElement, async () => {
  if (!pendingDeleteSessionId) return;
  await api(apiPath.session(pendingDeleteSessionId), { method: 'DELETE' });
  await element<DialogElement>('delete-dialog').hide();
  activeSessionId = '';
  pendingDeleteSessionId = '';
  localStorage.removeItem('cx_tg_session');
  await loadAll();
}));
element<HTMLFormElement>('new-session').addEventListener('submit', (event) => {
  event.preventDefault();
  const formElement = event.currentTarget as HTMLFormElement;
  runAction(submitButton(formElement), async () => {
    const workspace = currentWorkspace();
    if (!workspace) throw new Error('Select a workspace');
    const cwd = element<ValueElement>('cwd').value.trim();
    const title = element<ValueElement>('new-title').value.trim();
    const session = await api<Session>(apiPath.sessions, {
      method: 'POST',
      body: JSON.stringify({ nodeId: workspace.nodeId, cwd, title, config: runtimeConfigFromControls('new') }),
    });
    activeSessionId = session.id;
    localStorage.setItem('cx_tg_session', activeSessionId);
    formElement.reset();
    await loadAll();
    closeSidebarOnMobile();
  });
});
element<HTMLFormElement>('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  const formElement = event.currentTarget as HTMLFormElement;
  runAction(submitButton(formElement), async () => {
    if (!activeSessionId) throw new Error('Select a session');
    const text = element<ValueElement>('composer-text').value;
    element('send-state').textContent = 'Sending';
    try {
      await api(apiPath.session(activeSessionId, '/messages'), {
        method: 'POST',
        body: JSON.stringify({ text, ownerId: clientId, controlLabel }),
      });
      formElement.reset();
      await loadSession();
    } finally {
      element('send-state').textContent = '';
    }
  });
});

run((async () => {
  await ensureAuth();
  await loadAll();
})());
