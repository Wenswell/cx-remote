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

type JsonObject = Record<string, unknown>;

type SessionConfig = {
  model?: string;
  sandbox?: string;
  approvalPolicy?: string;
};

type Session = {
  id: string;
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
  name: string;
  path: string;
};

type DirectoryEntry = {
  name: string;
  relativePath: string;
};

type DirectoryListing = {
  current: string;
  relativePath: string;
  parentPath: string;
  entries: DirectoryEntry[];
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

let clientId = localStorage.getItem('cx_tg_client_id');
if (!clientId) {
  clientId = crypto.randomUUID();
  localStorage.setItem('cx_tg_client_id', clientId);
}

const controlLabel = `Web ${clientId.slice(0, 8)}`;
const jsonHeaders = { 'Content-Type': 'application/json' };
const apiPath = {
  auth: '/api/auth',
  status: '/api/status',
  workspaces: '/api/workspaces',
  sessions: '/api/sessions',
  adoptSession: '/api/sessions/adopt',
  files: (root: string, path: string) => `/api/files?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}`,
  session: (id: string, suffix = '') => `/api/sessions/${encodeURIComponent(id)}${suffix}`,
  approvals: (sessionId: string) => `/api/approvals?sessionId=${encodeURIComponent(sessionId)}&status=all&limit=50`,
  approvalResolve: (id: string) => `/api/approvals/${encodeURIComponent(id)}/resolve`,
  events: (sessionId: string | undefined, afterId: number | undefined) => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (afterId) params.set('afterId', String(afterId));
    const query = params.toString();
    return query ? `/api/events?${query}` : '/api/events';
  },
};

let activeSessionId = localStorage.getItem('cx_tg_session') || '';
let sessions: Session[] = [];
let messages: Message[] = [];
let pendingApprovals: Approval[] = [];
let approvalHistory: Approval[] = [];
let promptQueue: PromptJob[] = [];
let workspaces: Workspace[] = [];
let currentSession: Session | null = null;
let currentRoot = localStorage.getItem('cx_tg_root') || '';
let currentPath = '';
let homePath = '';
let streamBuffer = '';
let eventSource: EventSource | null = null;
let eventSourceSessionId = '';
let notificationEventSource: EventSource | null = null;
let notificationEventCursor = 0;
let pendingDeleteSessionId = '';
const eventCursorBySession = new Map<string, number>();

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

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

function displayPath(path: string): string {
  return homePath && (path === homePath || path.startsWith(`${homePath}/`)) ? `~${path.slice(homePath.length)}` : path;
}

function truncateText(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
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
  rememberNotificationEventCursor(status.eventCursor);
  element('status').textContent = `${status.stats.sessions} managed sessions · ${status.stats.pendingApprovals} approvals · ${status.stats.queuedPrompts} queued`;
  await loadWorkspaces();
  sessions = await api<Session[]>(apiPath.sessions);
  if (activeSessionId && !sessions.some((session) => session.id === activeSessionId)) activeSessionId = '';
  if (!activeSessionId && sessions[0]) activeSessionId = sessions[0].id;
  renderSessions();
  await loadSession();
  syncNotificationEvents();
}

async function loadWorkspaces(): Promise<void> {
  workspaces = await api<Workspace[]>(apiPath.workspaces);
  if (!workspaces.length) return;
  if (!workspaces.some((workspace) => workspace.path === currentRoot)) currentRoot = workspaces[0]!.path;
  localStorage.setItem('cx_tg_root', currentRoot);
  renderWorkspaceRoots();
  await loadDirs(currentPath);
}

function renderWorkspaceRoots(): void {
  const select = element<ValueElement>('workspace-root');
  select.innerHTML = '';
  for (const workspace of workspaces) {
    const option = document.createElement('sl-option');
    option.setAttribute('value', workspace.path);
    option.textContent = `${workspace.name} · ${workspace.path}`;
    select.appendChild(option);
  }
  if (workspaces.length === 1) {
    select.hidden = true;
    return;
  }
  select.hidden = false;
  select.value = currentRoot;
}

async function loadDirs(path: string): Promise<void> {
  if (!currentRoot) return;
  const data = await api<DirectoryListing>(apiPath.files(currentRoot, path));
  currentPath = data.relativePath || '';
  element<ValueElement>('cwd').value = data.current;
  element<ValueElement>('adopt-cwd').value = data.current;
  renderDirs(data);
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
  messages = data.messages;
  pendingApprovals = data.approvals;
  promptQueue = data.queue || [];
  rememberEventCursor(sessionId, data.eventCursor);
  approvalHistory = await api<Approval[]>(apiPath.approvals(sessionId));
  if (sessionId !== activeSessionId) return;
  renderSession();
  connectEvents(sessionId);
}

function renderSessions(): void {
  const container = element('sessions');
  container.innerHTML = '';
  for (const session of sessions) {
    const button = createButton('', {
      className: `session${session.id === activeSessionId ? ' active' : ''}`,
      size: 'small',
      onClick: async () => {
        activeSessionId = session.id;
        localStorage.setItem('cx_tg_session', activeSessionId);
        renderSessions();
        await loadSession();
      },
    });
    const line = document.createElement('span');
    line.className = 'session-line';
    const name = document.createElement('span');
    name.className = 'session-name';
    name.textContent = session.title;
    line.append(name, statusBadge(session.status));
    const cwd = document.createElement('span');
    cwd.className = 'session-path muted';
    cwd.textContent = displayPath(session.cwd);
    button.append(line, cwd);
    container.appendChild(button);
  }
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
  element('session-meta').textContent = displayPath(currentSession.cwd);

  const detail = element('session-detail');
  detail.innerHTML = '';
  const chips = document.createElement('div');
  chips.className = 'meta-row';
  [
    ['status', currentSession.status],
    ['control', currentSession.controlLabel || 'shared'],
    ['model', config.model || '-'],
    ['sandbox', config.sandbox || '-'],
    ['approval', config.approvalPolicy || '-'],
  ].forEach(([label, value]) => chips.appendChild(metaChip(label, value)));
  detail.appendChild(chips);

  const runtime = [
    ['Hub session', shortId(currentSession.id)],
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

function renderActionState(): void {
  const hasSession = Boolean(currentSession);
  const isControlledByMe = currentSession?.controlOwnerId === clientId;
  const isControlledByOther = Boolean(currentSession?.controlOwnerId && !isControlledByMe);
  const hasActiveWork = Boolean(currentSession && currentSession.status !== 'idle') || promptQueue.length > 0;

  element<ButtonElement>('rename').disabled = !hasSession;
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
  button.addEventListener('click', () => run(Promise.resolve(options.onClick())));
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
  rememberNotificationEventCursor(status.eventCursor);
}

function sessionTitle(sessionId: string): string {
  return sessions.find((session) => session.id === sessionId)?.title || currentSession?.title || 'CX TG';
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

element<ValueElement>('workspace-root').addEventListener('sl-change', (event) => {
  currentRoot = (event.currentTarget as ValueElement).value;
  currentPath = '';
  localStorage.setItem('cx_tg_root', currentRoot);
  run(loadDirs(''));
});
element('root-dir').addEventListener('click', () => run(loadDirs('')));
element('refresh').addEventListener('click', () => run(loadAll()));
element('claim').addEventListener('click', () => run((async () => {
  if (!currentSession) return;
  await api(apiPath.session(currentSession.id, '/control'), {
    method: 'PATCH',
    body: JSON.stringify({ controlType: 'web', ownerId: clientId, controlLabel, ttlMs: WEB_CONTROL_TTL_MS }),
  });
  await loadSession();
})()));
element('release').addEventListener('click', () => run((async () => {
  if (!currentSession) return;
  await api(apiPath.session(currentSession.id, `/control?ownerId=${encodeURIComponent(clientId)}`), { method: 'DELETE' });
  await loadSession();
})()));
element('stop').addEventListener('click', () => {
  if (activeSessionId) run(api(apiPath.session(activeSessionId, '/interrupt'), { method: 'POST' }).then(loadAll));
});
element('rename').addEventListener('click', () => run((async () => {
  if (!currentSession) return;
  const title = prompt('Title', currentSession.title);
  if (!title) return;
  await api(apiPath.session(currentSession.id), {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  await loadAll();
})()));
element('delete').addEventListener('click', () => {
  if (currentSession) showDeleteDialog(currentSession);
});
element<ToggleElement>('notify').addEventListener('sl-change', (event) => run((async () => {
  await updateSessionNotifications((event.currentTarget as ToggleElement).checked);
})()));
element('delete-cancel').addEventListener('click', () => run(element<DialogElement>('delete-dialog').hide()));
element('delete-confirm').addEventListener('click', () => run((async () => {
  if (!pendingDeleteSessionId) return;
  await api(apiPath.session(pendingDeleteSessionId), { method: 'DELETE' });
  await element<DialogElement>('delete-dialog').hide();
  activeSessionId = '';
  pendingDeleteSessionId = '';
  localStorage.removeItem('cx_tg_session');
  await loadAll();
})()));
element<HTMLFormElement>('new-session').addEventListener('submit', (event) => run((async () => {
  event.preventDefault();
  const formElement = event.currentTarget as HTMLFormElement;
  const cwd = element<ValueElement>('cwd').value.trim();
  const title = element<ValueElement>('new-title').value.trim();
  const session = await api<Session>(apiPath.sessions, {
    method: 'POST',
    body: JSON.stringify({ cwd, title }),
  });
  activeSessionId = session.id;
  localStorage.setItem('cx_tg_session', activeSessionId);
  formElement.reset();
  await loadAll();
})()));
element<HTMLFormElement>('adopt-session').addEventListener('submit', (event) => run((async () => {
  event.preventDefault();
  const formElement = event.currentTarget as HTMLFormElement;
  const threadId = element<ValueElement>('adopt-thread-id').value.trim();
  const cwd = element<ValueElement>('adopt-cwd').value.trim();
  const title = element<ValueElement>('adopt-title').value.trim();
  const session = await api<Session>(apiPath.adoptSession, {
    method: 'POST',
    body: JSON.stringify({ threadId, cwd, title }),
  });
  activeSessionId = session.id;
  localStorage.setItem('cx_tg_session', activeSessionId);
  formElement.reset();
  element<ValueElement>('adopt-cwd').value = element<ValueElement>('cwd').value;
  await loadAll();
})()));
element<HTMLFormElement>('composer').addEventListener('submit', (event) => run((async () => {
  event.preventDefault();
  if (!activeSessionId) throw new Error('Select a session');
  const formElement = event.currentTarget as HTMLFormElement;
  const text = element<ValueElement>('composer-text').value;
  element('send-state').textContent = 'Sending';
  await api(apiPath.session(activeSessionId, '/messages'), {
    method: 'POST',
    body: JSON.stringify({ text, ownerId: clientId, controlLabel }),
  });
  formElement.reset();
  element('send-state').textContent = '';
  await loadSession();
})()));

run((async () => {
  await ensureAuth();
  await loadAll();
})());
