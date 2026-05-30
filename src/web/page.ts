export function webPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CX TG</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7f7f5;
      --panel: #ffffff;
      --text: #161616;
      --muted: #686868;
      --line: #d7d7d2;
      --accent: #0f766e;
      --danger: #b42318;
      --code: #f0f1ef;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #141514;
        --panel: #1d1f1e;
        --text: #f0f0ed;
        --muted: #aaa9a4;
        --line: #363936;
        --accent: #2dd4bf;
        --danger: #ff7468;
        --code: #282b29;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    button, input, textarea, select { font: inherit; }
    button {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      border-radius: 6px;
      padding: 7px 10px;
      cursor: pointer;
    }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
    button.danger {
      border-color: var(--danger);
      color: var(--danger);
    }
    input, textarea, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      padding: 9px 10px;
    }
    textarea {
      min-height: 92px;
      resize: vertical;
    }
    .shell {
      display: grid;
      grid-template-columns: minmax(270px, 360px) minmax(0, 1fr);
      min-height: 100vh;
    }
    .side {
      border-right: 1px solid var(--line);
      padding: 16px;
      overflow: auto;
    }
    .main {
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      min-width: 0;
      min-height: 100vh;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--line);
      padding: 12px 16px;
    }
    .title {
      font-weight: 700;
      font-size: 18px;
    }
    .muted { color: var(--muted); }
    .stack {
      display: grid;
      gap: 10px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .row > input { flex: 1 1 180px; }
    .row > button { flex: 0 0 auto; }
    .session {
      width: 100%;
      text-align: left;
      display: grid;
      gap: 4px;
    }
    .session.active { border-color: var(--accent); }
    .session-name { font-weight: 650; }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      color: var(--muted);
      width: fit-content;
    }
    .dir-list {
      display: grid;
      gap: 6px;
      max-height: 180px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px;
      background: color-mix(in srgb, var(--panel) 70%, var(--bg));
    }
    .dir-list button {
      width: 100%;
      text-align: left;
      padding: 6px 8px;
    }
    .details {
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .approvals {
      border-bottom: 1px solid var(--line);
      padding: 12px 16px;
      display: grid;
      gap: 10px;
    }
    .approval {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--panel);
      display: grid;
      gap: 8px;
    }
    .approval.resolved { opacity: 0.78; }
    .messages {
      padding: 16px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 10px 12px;
      max-width: 980px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .msg.user { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }
    .msg.tool {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: var(--code);
    }
    .msg.error { border-color: var(--danger); }
    .msg.streaming { border-style: dashed; }
    .composer {
      border-top: 1px solid var(--line);
      padding: 12px 16px;
      background: color-mix(in srgb, var(--bg) 85%, var(--panel));
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--code);
      padding: 8px;
      border-radius: 6px;
      margin: 0;
    }
    @media (max-width: 760px) {
      .shell { grid-template-columns: 1fr; }
      .side {
        border-right: 0;
        border-bottom: 1px solid var(--line);
        max-height: 48vh;
      }
      .topbar { align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="stack">
        <div>
          <div class="title">CX TG</div>
          <div class="muted" id="status">Loading</div>
        </div>
        <form id="new-session" class="stack">
          <select id="workspace-root" name="root"></select>
          <div class="row">
            <input id="cwd" name="cwd" placeholder="Workspace directory" autocomplete="off">
            <button id="root-dir" type="button">Root</button>
          </div>
          <div id="dirs" class="dir-list"></div>
          <input name="title" placeholder="Session title" autocomplete="off">
          <button class="primary" type="submit">New Session</button>
        </form>
        <div class="row">
          <button id="refresh" type="button">Refresh</button>
        </div>
        <div id="sessions" class="stack"></div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <div class="title" id="session-title">No session</div>
          <div class="muted" id="session-meta">Create or select a session.</div>
          <div class="details" id="session-detail"></div>
        </div>
        <div class="row">
          <button id="claim" type="button">Claim</button>
          <button id="release" type="button">Release</button>
          <button id="rename" type="button">Rename</button>
          <button id="stop" class="danger" type="button">Stop</button>
          <button id="delete" class="danger" type="button">Delete</button>
        </div>
      </header>
      <section class="approvals">
        <div id="pending-approvals" class="stack"></div>
        <div id="approval-history" class="stack"></div>
      </section>
      <section class="messages" id="messages"></section>
      <form id="composer" class="composer stack">
        <textarea name="text" placeholder="Send a message to Codex"></textarea>
        <div class="row">
          <button class="primary" type="submit">Send</button>
          <span class="muted" id="send-state"></span>
        </div>
      </form>
    </main>
  </div>
  <script>
    const token = new URLSearchParams(location.search).get('token') || localStorage.getItem('cx_tg_token') || prompt('Access token');
    if (token) localStorage.setItem('cx_tg_token', token);
    let clientId = localStorage.getItem('cx_tg_client_id') || '';
    if (!clientId) {
      clientId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()).slice(2);
      localStorage.setItem('cx_tg_client_id', clientId);
    }
    const controlLabel = 'Web ' + clientId.slice(0, 8);
    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    let activeSessionId = localStorage.getItem('cx_tg_session') || '';
    let sessions = [];
    let messages = [];
    let pendingApprovals = [];
    let approvalHistory = [];
    let workspaces = [];
    let currentSession = null;
    let currentRoot = localStorage.getItem('cx_tg_root') || '';
    let currentPath = '';
    let streamBuffer = '';
    let eventSource = null;

    const $ = (id) => document.getElementById(id);

    const api = async (path, options = {}) => {
      const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
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
      const status = await api('/api/status');
      $('status').textContent = status.stats.sessions + ' sessions · ' + status.stats.pendingApprovals + ' approvals · ' + status.stats.queuedPrompts + ' queued';
      await loadWorkspaces();
      sessions = await api('/api/sessions');
      if (activeSessionId && !sessions.some((session) => session.id === activeSessionId)) activeSessionId = '';
      if (!activeSessionId && sessions[0]) activeSessionId = sessions[0].id;
      renderSessions();
      await loadSession();
    }

    async function loadWorkspaces() {
      workspaces = await api('/api/workspaces');
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
      const data = await api('/api/files?root=' + encodeURIComponent(currentRoot) + '&path=' + encodeURIComponent(path || ''));
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
      streamBuffer = '';
      if (!activeSessionId) {
        currentSession = null;
        messages = [];
        pendingApprovals = [];
        approvalHistory = [];
        renderSession();
        return;
      }
      const data = await api('/api/sessions/' + encodeURIComponent(activeSessionId));
      currentSession = data.session;
      messages = data.messages;
      pendingApprovals = data.approvals;
      approvalHistory = await api('/api/approvals?sessionId=' + encodeURIComponent(activeSessionId) + '&status=all&limit=50');
      renderSession();
      connectEvents();
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
      renderApprovals();
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
      await api('/api/approvals/' + encodeURIComponent(id) + '/resolve', {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      await loadSession();
    }

    function connectEvents() {
      if (eventSource) eventSource.close();
      if (!activeSessionId) return;
      const url = '/api/events?sessionId=' + encodeURIComponent(activeSessionId) + '&token=' + encodeURIComponent(token);
      eventSource = new EventSource(url);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message.delta') {
          appendDelta(String(data.payload?.delta || ''));
          return;
        }
        if (data.type === 'session.deleted') {
          activeSessionId = '';
          localStorage.removeItem('cx_tg_session');
          loadAll().catch(console.error);
          return;
        }
        if (data.type === 'message.created') {
          const message = data.payload?.message;
          if (message) {
            messages.push(message);
            if (message.role === 'assistant') streamBuffer = '';
            renderMessages();
            return;
          }
        }
        if (['approval.created', 'approval.resolved', 'session.control.updated'].includes(data.type)) {
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
      await api('/api/sessions/' + encodeURIComponent(currentSession.id) + '/control', {
        method: 'PATCH',
        body: JSON.stringify({ controlType: 'web', ownerId: clientId, controlLabel, ttlMs: 600000 })
      });
      await loadSession();
    };
    $('release').onclick = async () => {
      if (!currentSession) return;
      await api('/api/sessions/' + encodeURIComponent(currentSession.id) + '/control?ownerId=' + encodeURIComponent(clientId), { method: 'DELETE' });
      await loadSession();
    };
    $('stop').onclick = () => activeSessionId && api('/api/sessions/' + encodeURIComponent(activeSessionId) + '/interrupt', { method: 'POST' }).then(loadAll).catch(alert);
    $('rename').onclick = async () => {
      if (!currentSession) return;
      const title = prompt('Title', currentSession.title);
      if (!title) return;
      await api('/api/sessions/' + encodeURIComponent(currentSession.id), {
        method: 'PATCH',
        body: JSON.stringify({ title })
      });
      await loadAll();
    };
    $('delete').onclick = async () => {
      if (!currentSession) return;
      if (!confirm('Delete session ' + currentSession.title + '?')) return;
      await api('/api/sessions/' + encodeURIComponent(currentSession.id), { method: 'DELETE' });
      activeSessionId = '';
      localStorage.removeItem('cx_tg_session');
      await loadAll();
    };
    $('new-session').onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const session = await api('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ cwd: form.get('cwd'), title: form.get('title') })
      });
      activeSessionId = session.id;
      localStorage.setItem('cx_tg_session', activeSessionId);
      event.currentTarget.reset();
      await loadAll();
    };
    $('composer').onsubmit = async (event) => {
      event.preventDefault();
      if (!activeSessionId) return alert('Select a session');
      const text = new FormData(event.currentTarget).get('text');
      $('send-state').textContent = 'Sending';
      await api('/api/sessions/' + encodeURIComponent(activeSessionId) + '/messages', {
        method: 'POST',
        body: JSON.stringify({ text, ownerId: clientId, controlLabel })
      });
      event.currentTarget.reset();
      $('send-state').textContent = '';
      await loadSession();
    };
    loadAll().catch((error) => {
      $('status').textContent = error.message;
      console.error(error);
    });
  </script>
</body>
</html>`;
}
