import { WEB_CONTROL_TTL_MS } from '../controls/control-actions.js';

export function webScript(): string {
  return `    const tokenFromUrl = new URLSearchParams(location.search).get('token') || '';
    if (tokenFromUrl) clearTokenFromUrl();
    let clientId = localStorage.getItem('cx_tg_client_id') || '';
    if (!clientId) {
      clientId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()).slice(2);
      localStorage.setItem('cx_tg_client_id', clientId);
    }
    const WEB_CONTROL_TTL_MS = ${WEB_CONTROL_TTL_MS};
    const controlLabel = 'Web ' + clientId.slice(0, 8);
    const headers = { 'Content-Type': 'application/json' };
    const apiPath = {
      auth: '/api/auth',
      status: '/api/status',
      workspaces: '/api/workspaces',
      sessions: '/api/sessions',
      files: (root, path) => '/api/files?root=' + encodeURIComponent(root) + '&path=' + encodeURIComponent(path || ''),
      session: (id, suffix = '') => '/api/sessions/' + encodeURIComponent(id) + suffix,
      approvals: (sessionId) => '/api/approvals?sessionId=' + encodeURIComponent(sessionId) + '&status=all&limit=50',
      approvalResolve: (id) => '/api/approvals/' + encodeURIComponent(id) + '/resolve',
      events: (sessionId, afterId) => {
        const params = new URLSearchParams({ sessionId });
        if (afterId) params.set('afterId', String(afterId));
        return '/api/events?' + params.toString();
      }
    };
    let activeSessionId = localStorage.getItem('cx_tg_session') || '';
    let sessions = [];
    let messages = [];
    let pendingApprovals = [];
    let approvalHistory = [];
    let promptQueue = [];
    let workspaces = [];
    let currentSession = null;
    let currentRoot = localStorage.getItem('cx_tg_root') || '';
    let currentPath = '';
    let streamBuffer = '';
    let eventSource = null;
    let eventSourceSessionId = '';
    const eventCursorBySession = new Map();

    const $ = (id) => document.getElementById(id);

    async function ensureAuth() {
      const current = await fetch(apiPath.status, { credentials: 'same-origin' });
      if (current.ok) return;
      const token = tokenFromUrl || prompt('Access token') || '';
      const res = await fetch(apiPath.auth, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error(await parseAuthError(res));
    }

    async function parseAuthError(res) {
      const text = await res.text();
      try {
        const payload = JSON.parse(text);
        return payload.error?.message || text || res.statusText;
      } catch {
        return text || res.statusText;
      }
    }

    function clearTokenFromUrl() {
      const url = new URL(location.href);
      url.searchParams.delete('token');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    const api = async (path, options = {}) => {
      const res = await fetch(path, { ...options, credentials: 'same-origin', headers: { ...headers, ...(options.headers || {}) } });
      const text = await res.text();
      if (!res.ok) {
        try {
          const payload = JSON.parse(text);
          throw new Error(payload.error?.message || text);
        } catch (error) {
          if (error instanceof SyntaxError) throw new Error(text || res.statusText);
          throw error;
        }
      }
      return res.headers.get('content-type')?.includes('application/json') && text ? JSON.parse(text) : text;
    };

    async function loadAll() {
      const status = await api(apiPath.status);
      $('status').textContent = status.stats.sessions + ' sessions · ' + status.stats.pendingApprovals + ' approvals · ' + status.stats.queuedPrompts + ' queued';
      await loadWorkspaces();
      sessions = await api(apiPath.sessions);
      if (activeSessionId && !sessions.some((session) => session.id === activeSessionId)) activeSessionId = '';
      if (!activeSessionId && sessions[0]) activeSessionId = sessions[0].id;
      renderSessions();
      await loadSession();
    }

    async function loadWorkspaces() {
      workspaces = await api(apiPath.workspaces);
      if (!workspaces.length) return;
      if (!workspaces.some((workspace) => workspace.path === currentRoot)) currentRoot = workspaces[0].path;
      localStorage.setItem('cx_tg_root', currentRoot);
      renderWorkspaceRoots();
      await loadDirs(currentPath);
    }

    function renderWorkspaceRoots() {
      const select = $('workspace-root');
      select.innerHTML = '';
      for (const workspace of workspaces) {
        const option = document.createElement('option');
        option.value = workspace.path;
        option.textContent = workspace.name + ' · ' + workspace.path;
        select.appendChild(option);
      }
      select.value = currentRoot;
    }

    async function loadDirs(path) {
      if (!currentRoot) return;
      const data = await api(apiPath.files(currentRoot, path));
      currentPath = data.relativePath || '';
      $('cwd').value = data.current;
      renderDirs(data);
    }

    function renderDirs(data) {
      const box = $('dirs');
      box.innerHTML = '';
      if (data.relativePath) {
        const up = document.createElement('button');
        up.type = 'button';
        up.textContent = '..';
        up.onclick = () => loadDirs(data.parentPath).catch(alert);
        box.appendChild(up);
      }
      for (const entry of data.entries) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = entry.name;
        btn.onclick = () => loadDirs(entry.relativePath).catch(alert);
        box.appendChild(btn);
      }
      if (!box.childElementCount) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = 'No child directories';
        box.appendChild(empty);
      }
    }

    async function loadSession() {
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
      const data = await api(apiPath.session(sessionId));
      if (sessionId !== activeSessionId) return;
      currentSession = data.session;
      messages = data.messages;
      pendingApprovals = data.approvals;
      promptQueue = data.queue || [];
      rememberEventCursor(sessionId, data.eventCursor);
      approvalHistory = await api(apiPath.approvals(sessionId));
      if (sessionId !== activeSessionId) return;
      renderSession();
      connectEvents(sessionId);
    }

    function renderSessions() {
      $('sessions').innerHTML = '';
      for (const session of sessions) {
        const btn = document.createElement('button');
        btn.className = 'session' + (session.id === activeSessionId ? ' active' : '');
        const name = document.createElement('span');
        name.className = 'session-name';
        name.textContent = session.title;
        const cwd = document.createElement('span');
        cwd.className = 'muted';
        cwd.textContent = session.cwd;
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = session.status;
        btn.append(name, cwd, pill);
        btn.onclick = () => {
          activeSessionId = session.id;
          localStorage.setItem('cx_tg_session', activeSessionId);
          loadSession().catch(alert);
          renderSessions();
        };
        $('sessions').appendChild(btn);
      }
    }

    function renderSession() {
      if (!currentSession) {
        $('session-title').textContent = 'No session';
        $('session-meta').textContent = 'Create or select a session.';
        $('session-detail').textContent = '';
      } else {
        $('session-title').textContent = currentSession.title;
        $('session-meta').textContent = currentSession.cwd + ' · ' + currentSession.status + ' · ' + currentSession.id;
        const config = currentSession.config || {};
        $('session-detail').textContent = [
          'model ' + (config.model || '-'),
          'sandbox ' + (config.sandbox || '-'),
          'approval ' + (config.approvalPolicy || '-'),
          'control ' + (currentSession.controlLabel || 'shared'),
          'lease ' + (currentSession.controlLeaseExpiresAt ? new Date(currentSession.controlLeaseExpiresAt).toLocaleString() : '-'),
          'thread ' + (currentSession.codexThreadId || '-'),
          'turn ' + (currentSession.currentTurnId || '-'),
          'error ' + (currentSession.lastError || '-')
        ].join(' · ');
      }
      renderMessages();
      renderPromptQueue();
      renderApprovals();
      renderActionState();
    }

    function renderActionState() {
      const hasSession = Boolean(currentSession);
      const isControlledByMe = currentSession?.controlOwnerId === clientId;
      const isControlledByOther = Boolean(currentSession?.controlOwnerId && !isControlledByMe);
      const hasActiveWork = Boolean(currentSession && currentSession.status !== 'idle') || promptQueue.length > 0;

      $('rename').disabled = !hasSession;
      $('delete').disabled = !hasSession;

      $('claim').hidden = !hasSession || isControlledByMe;
      $('claim').disabled = !hasSession || isControlledByOther;
      $('claim').textContent = isControlledByOther ? 'Controlled by ' + (currentSession.controlLabel || 'another client') : 'Take control';

      $('release').hidden = !hasSession || !isControlledByMe;
      $('release').disabled = !isControlledByMe;

      $('stop').hidden = !hasSession || !hasActiveWork;
      $('stop').disabled = !hasActiveWork;
    }

    function renderMessages() {
      const box = $('messages');
      box.innerHTML = '';
      for (const message of messages) box.appendChild(messageNode(message));
      if (streamBuffer) box.appendChild(streamingNode());
      box.scrollTop = box.scrollHeight;
    }

    function messageNode(message) {
      const div = document.createElement('div');
      div.className = 'msg ' + message.role + (message.kind === 'error' ? ' error' : '');
      const queued = message.metadata?.queued ? ' queued' : '';
      div.textContent = '[' + message.role + queued + ']\\n' + message.content;
      return div;
    }

    function streamingNode() {
      const div = document.createElement('div');
      div.id = 'streaming-message';
      div.className = 'msg assistant streaming';
      div.textContent = '[assistant]\\n' + streamBuffer;
      return div;
    }

    function appendDelta(delta) {
      streamBuffer += delta;
      let div = $('streaming-message');
      if (!div) {
        div = streamingNode();
        $('messages').appendChild(div);
      } else {
        div.textContent = '[assistant]\\n' + streamBuffer;
      }
      $('messages').scrollTop = $('messages').scrollHeight;
    }

    function renderApprovals() {
      renderApprovalList($('pending-approvals'), pendingApprovals, true);
      renderApprovalList($('approval-history'), approvalHistory.filter((approval) => approval.status !== 'pending'), false);
    }

    function renderPromptQueue() {
      const container = $('prompt-queue');
      container.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'muted';
      title.textContent = 'Prompt queue';
      container.appendChild(title);
      if (!promptQueue.length) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = 'No active prompt jobs';
        container.appendChild(empty);
        return;
      }
      promptQueue.forEach((job, index) => {
        const div = document.createElement('div');
        div.className = 'queue-job ' + job.status;
        const head = document.createElement('div');
        head.textContent = '#' + (index + 1) + ' · ' + job.status + ' · ' + job.source + ' · ' + new Date(job.createdAt).toLocaleString();
        const pre = document.createElement('pre');
        pre.textContent = job.text;
        div.append(head, pre);
        container.appendChild(div);
      });
    }

    function renderApprovalList(container, approvals, pending) {
      container.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'muted';
      title.textContent = pending ? 'Pending approvals' : 'Approval history';
      container.appendChild(title);
      if (!approvals.length) {
        const empty = document.createElement('div');
        empty.className = 'muted';
        empty.textContent = pending ? 'No pending approvals' : 'No approval history';
        container.appendChild(empty);
        return;
      }
      for (const approval of approvals) {
        const div = document.createElement('div');
        div.className = 'approval' + (pending ? '' : ' resolved');
        const head = document.createElement('div');
        head.textContent = approval.toolName + ' · ' + approval.status + (approval.decision ? ' · ' + approval.decision : '');
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(approval.input, null, 2);
        div.append(head, pre);
        if (pending) {
          const row = document.createElement('div');
          row.className = 'row';
          const allow = document.createElement('button');
          allow.className = 'primary';
          allow.textContent = approval.type === 'choice' ? 'Choose 1' : 'Allow';
          allow.onclick = () => resolveApproval(approval.id, approval.type === 'choice' ? '0' : 'approved');
          const deny = document.createElement('button');
          deny.className = 'danger';
          deny.textContent = approval.type === 'choice' ? 'Cancel' : 'Deny';
          deny.onclick = () => resolveApproval(approval.id, approval.type === 'choice' ? 'cancel' : 'denied');
          row.append(allow, deny);
          div.appendChild(row);
        }
        container.appendChild(div);
      }
    }

    async function resolveApproval(id, decision) {
      await api(apiPath.approvalResolve(id), {
        method: 'POST',
        body: JSON.stringify({ decision, controlType: 'web' })
      });
      await loadSession();
    }

    function rememberEventCursor(sessionId, value) {
      const id = Number(value);
      if (!Number.isFinite(id) || id <= 0) return;
      const current = eventCursorBySession.get(sessionId) || 0;
      if (id > current) eventCursorBySession.set(sessionId, id);
    }

    function closeEvents() {
      if (eventSource) eventSource.close();
      eventSource = null;
      eventSourceSessionId = '';
    }

    function connectEvents(sessionId) {
      if (eventSource && eventSourceSessionId === sessionId) return;
      closeEvents();
      if (!sessionId) return;
      eventSourceSessionId = sessionId;
      const url = apiPath.events(sessionId, eventCursorBySession.get(sessionId));
      eventSource = new EventSource(url, { withCredentials: true });
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
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
          loadAll().catch(console.error);
          return;
        }
        if (data.type === 'message.created') {
          const message = data.payload?.message;
          if (message && !messages.some((item) => item.id === message.id)) {
            messages.push(message);
            if (message.role === 'assistant') streamBuffer = '';
            renderMessages();
            return;
          }
        }
        if (['approval.created', 'approval.resolved', 'session.control.updated'].includes(data.type)
          || (data.type === 'session.updated' && data.payload?.queuedPrompts !== undefined)) {
          loadSession().catch(console.error);
        }
      };
    }

    $('workspace-root').onchange = (event) => {
      currentRoot = event.currentTarget.value;
      currentPath = '';
      localStorage.setItem('cx_tg_root', currentRoot);
      loadDirs('').catch(alert);
    };
    $('root-dir').onclick = () => loadDirs('').catch(alert);
    $('refresh').onclick = () => loadAll().catch(alert);
    $('claim').onclick = async () => {
      if (!currentSession) return;
      await api(apiPath.session(currentSession.id, '/control'), {
        method: 'PATCH',
        body: JSON.stringify({ controlType: 'web', ownerId: clientId, controlLabel, ttlMs: WEB_CONTROL_TTL_MS })
      });
      await loadSession();
    };
    $('release').onclick = async () => {
      if (!currentSession) return;
      await api(apiPath.session(currentSession.id, '/control?ownerId=' + encodeURIComponent(clientId)), { method: 'DELETE' });
      await loadSession();
    };
    $('stop').onclick = () => activeSessionId && api(apiPath.session(activeSessionId, '/interrupt'), { method: 'POST' }).then(loadAll).catch(alert);
    $('rename').onclick = async () => {
      if (!currentSession) return;
      const title = prompt('Title', currentSession.title);
      if (!title) return;
      await api(apiPath.session(currentSession.id), {
        method: 'PATCH',
        body: JSON.stringify({ title })
      });
      await loadAll();
    };
    $('delete').onclick = async () => {
      if (!currentSession) return;
      if (!confirm('Delete session ' + currentSession.title + '?')) return;
      await api(apiPath.session(currentSession.id), { method: 'DELETE' });
      activeSessionId = '';
      localStorage.removeItem('cx_tg_session');
      await loadAll();
    };
    $('new-session').onsubmit = async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const session = await api(apiPath.sessions, {
        method: 'POST',
        body: JSON.stringify({ cwd: form.get('cwd'), title: form.get('title') })
      });
      activeSessionId = session.id;
      localStorage.setItem('cx_tg_session', activeSessionId);
      formElement.reset();
      await loadAll();
    };
    $('composer').onsubmit = async (event) => {
      event.preventDefault();
      if (!activeSessionId) return alert('Select a session');
      const formElement = event.currentTarget;
      const text = new FormData(formElement).get('text');
      $('send-state').textContent = 'Sending';
      await api(apiPath.session(activeSessionId, '/messages'), {
        method: 'POST',
        body: JSON.stringify({ text, ownerId: clientId, controlLabel })
      });
      formElement.reset();
      $('send-state').textContent = '';
      await loadSession();
    };
    async function boot() {
      await ensureAuth();
      await loadAll();
    }

    boot().catch((error) => {
      $('status').textContent = error.message;
      console.error(error);
    });`;
}
