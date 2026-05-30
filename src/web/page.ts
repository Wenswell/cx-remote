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
    button, input, textarea, select {
      font: inherit;
    }
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
    input, textarea {
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
      grid-template-columns: minmax(250px, 330px) minmax(0, 1fr);
      min-height: 100vh;
    }
    .side {
      border-right: 1px solid var(--line);
      padding: 16px;
      overflow: auto;
    }
    .main {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-width: 0;
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
    .muted {
      color: var(--muted);
    }
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
    .session {
      width: 100%;
      text-align: left;
      display: grid;
      gap: 4px;
    }
    .session.active {
      border-color: var(--accent);
    }
    .session-name {
      font-weight: 650;
    }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      color: var(--muted);
    }
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
    .msg.user {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    }
    .msg.tool {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: var(--code);
    }
    .msg.error {
      border-color: var(--danger);
    }
    .composer {
      border-top: 1px solid var(--line);
      padding: 12px 16px;
      background: color-mix(in srgb, var(--bg) 85%, var(--panel));
    }
    .approvals {
      padding: 0 16px 12px;
    }
    .approval {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--panel);
      margin-top: 10px;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--code);
      padding: 8px;
      border-radius: 6px;
      margin: 8px 0;
    }
    @media (max-width: 760px) {
      .shell {
        grid-template-columns: 1fr;
      }
      .side {
        border-right: 0;
        border-bottom: 1px solid var(--line);
        max-height: 45vh;
      }
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
          <input name="cwd" placeholder="/home/ilove/Documents/repos/project" autocomplete="off">
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
        </div>
        <button id="stop" class="danger" type="button">Stop</button>
      </header>
      <section>
        <div class="approvals" id="approvals"></div>
        <div class="messages" id="messages"></div>
      </section>
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
    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    let activeSessionId = localStorage.getItem('cx_tg_session') || '';
    let sessions = [];
    let messages = [];
    let approvals = [];
    let eventSource = null;

    const $ = (id) => document.getElementById(id);
    const api = async (path, options = {}) => {
      const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
      if (!res.ok) throw new Error(await res.text());
      return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
    };

    async function loadAll() {
      const status = await api('/api/status');
      $('status').textContent = status.stats.sessions + ' sessions · ' + status.stats.pendingApprovals + ' approvals';
      sessions = await api('/api/sessions');
      if (!activeSessionId && sessions[0]) activeSessionId = sessions[0].id;
      renderSessions();
      await loadSession();
    }

    async function loadSession() {
      if (!activeSessionId) {
        messages = [];
        approvals = [];
        renderSession();
        return;
      }
      const data = await api('/api/sessions/' + activeSessionId);
      messages = data.messages;
      approvals = data.approvals;
      renderSession(data.session);
      connectEvents();
    }

    function renderSessions() {
      $('sessions').innerHTML = '';
      for (const session of sessions) {
        const btn = document.createElement('button');
        btn.className = 'session' + (session.id === activeSessionId ? ' active' : '');
        btn.innerHTML = '<span class="session-name"></span><span class="muted"></span><span class="pill"></span>';
        btn.querySelector('.session-name').textContent = session.title;
        btn.querySelector('.muted').textContent = session.cwd;
        btn.querySelector('.pill').textContent = session.status;
        btn.onclick = () => {
          activeSessionId = session.id;
          localStorage.setItem('cx_tg_session', activeSessionId);
          loadSession().catch(alert);
          renderSessions();
        };
        $('sessions').appendChild(btn);
      }
    }

    function renderSession(session) {
      if (!session) {
        $('session-title').textContent = 'No session';
        $('session-meta').textContent = 'Create or select a session.';
      } else {
        $('session-title').textContent = session.title;
        $('session-meta').textContent = session.cwd + ' · ' + session.status + ' · ' + session.id;
      }
      $('messages').innerHTML = '';
      for (const message of messages) {
        const div = document.createElement('div');
        div.className = 'msg ' + message.role + (message.kind === 'error' ? ' error' : '');
        div.textContent = '[' + message.role + ']\\n' + message.content;
        $('messages').appendChild(div);
      }
      $('messages').scrollTop = $('messages').scrollHeight;
      renderApprovals();
    }

    function renderApprovals() {
      $('approvals').innerHTML = '';
      for (const approval of approvals) {
        const div = document.createElement('div');
        div.className = 'approval';
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(approval.input, null, 2);
        const row = document.createElement('div');
        row.className = 'row';
        const allow = document.createElement('button');
        allow.className = 'primary';
        allow.textContent = approval.type === 'choice' ? 'Choose 1' : 'Allow';
        allow.onclick = () => resolveApproval(approval.id, approval.type === 'choice' ? '0' : 'approved');
        const deny = document.createElement('button');
        deny.className = 'danger';
        deny.textContent = approval.type === 'choice' ? 'Cancel' : 'Deny';
        deny.onclick = () => resolveApproval(approval.id, 'denied');
        row.append(allow, deny);
        div.append('Approval: ' + approval.toolName, pre, row);
        $('approvals').appendChild(div);
      }
    }

    async function resolveApproval(id, decision) {
      await api('/api/approvals/' + id + '/resolve', {
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
        if (['message.created', 'approval.created', 'approval.resolved', 'session.updated'].includes(data.type)) {
          loadAll().catch(console.error);
        }
      };
    }

    $('refresh').onclick = () => loadAll().catch(alert);
    $('stop').onclick = () => activeSessionId && api('/api/sessions/' + activeSessionId + '/interrupt', { method: 'POST' }).then(loadAll).catch(alert);
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
      await api('/api/sessions/' + activeSessionId + '/messages', {
        method: 'POST',
        body: JSON.stringify({ text })
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
