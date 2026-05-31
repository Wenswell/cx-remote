export function webStyles(): string {
  return `    :root {
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
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
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
      height: 100vh;
      min-height: 0;
      overflow: hidden;
    }
    .side {
      border-right: 1px solid var(--line);
      padding: 16px;
      overflow: auto;
      min-height: 0;
    }
    .main {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      min-width: 0;
      min-height: 0;
      height: 100vh;
      overflow: hidden;
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
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .meta-chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      background: color-mix(in srgb, var(--panel) 78%, var(--bg));
      color: var(--muted);
      font-size: 12px;
    }
    .meta-chip strong {
      color: var(--text);
      font-weight: 650;
    }
    .runtime-line {
      margin-top: 6px;
    }
    .approvals {
      border-bottom: 1px solid var(--line);
      padding: 12px 16px;
      display: grid;
      gap: 10px;
    }
    .approval, .queue-job {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: var(--panel);
      display: grid;
      gap: 8px;
    }
    .approval.resolved { opacity: 0.78; }
    .queue-job.done, .queue-job.failed, .queue-job.canceled { opacity: 0.78; }
    .messages {
      padding: 16px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
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
      .shell {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(180px, 42vh) minmax(0, 1fr);
      }
      .side {
        border-right: 0;
        border-bottom: 1px solid var(--line);
        height: auto;
      }
      .main {
        height: auto;
      }
      .topbar { align-items: flex-start; }
    }`;
}
