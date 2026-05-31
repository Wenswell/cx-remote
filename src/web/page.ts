export function webPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CX TG</title>
  <link rel="stylesheet" href="/assets/web.css">
  <script defer src="/assets/web.js"></script>
</head>
<body>
  <div class="shell">
    <aside class="side stack">
      <div>
        <div class="title">CX TG</div>
        <div class="muted" id="status">Loading</div>
      </div>
      <div class="row">
        <button id="refresh" type="button">Refresh</button>
      </div>
      <div id="sessions" class="stack"></div>
      <form id="new-session" class="stack">
        <strong>New session</strong>
        <select id="workspace-root"></select>
        <div class="row">
          <button id="root-dir" type="button">Root</button>
          <input id="cwd" name="cwd" placeholder="cwd" required>
        </div>
        <div id="dirs" class="dir-list"></div>
        <input name="title" placeholder="title optional">
        <button class="primary" type="submit">Create</button>
      </form>
      <div id="prompt-queue" class="stack"></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <div class="title" id="session-title">No session</div>
          <div class="details" id="session-meta"></div>
          <div class="details" id="session-detail"></div>
        </div>
        <div class="row">
          <button id="claim" type="button">Claim</button>
          <button id="release" type="button">Release</button>
          <button id="rename" type="button">Rename</button>
          <button id="stop" type="button">Stop</button>
          <button id="delete" class="danger" type="button">Delete</button>
        </div>
      </header>
      <section class="approvals">
        <div id="pending-approvals" class="stack"></div>
        <details>
          <summary>Approval history</summary>
          <div id="approval-history" class="stack"></div>
        </details>
      </section>
      <section class="messages" id="messages"></section>
      <form id="composer" class="composer">
        <textarea name="text" placeholder="Message Codex" required></textarea>
        <div class="row">
          <button class="primary" type="submit">Send</button>
          <span class="muted" id="send-state"></span>
        </div>
      </form>
    </main>
  </div>
</body>
</html>`;
}
