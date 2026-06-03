# Session Model

`cx-tg` uses Hub-managed sessions as its product boundary. A Hub session is the record shared by Web, Telegram, and CLI. It stores the working directory, runtime config, control owner, prompt queue, approvals, Hub messages, Hub events, and the mapped Codex thread id.

Native Codex sessions become visible in `cx-tg` after adoption. Adoption creates a Hub session with an existing `codexThreadId`; future prompts then go through the Hub and stay synchronized across Web, Telegram, and CLI.

## Flows

```text
Create managed session
  POST /api/sessions { cwd, config? }
  cx-tg new --cwd <path> [runtime flags]
      │
      ▼
  Hub Session with empty codexThreadId
      │ first prompt
      ▼
  codex app-server thread/start
```

```text
Adopt Codex session
  Web: choose workspace directory
  Web: GET /api/sessions?cwd=<path>
  Web: GET /api/codex/sessions?cwd=<path>
  Web: GET /api/codex/sessions/:threadId/preview
  Web: choose an unmanaged Codex session recorded for that cwd
  POST /api/sessions/adopt { threadId, cwd, config?, importTranscript: true }
  cx-tg adopt --thread <thread-id> --cwd <path> --import [runtime flags]
      │
      ▼
  Hub Session with codexThreadId
      │ first prompt
      ▼
  codex app-server thread/resume
      │
      ▼
  codex app-server turn/start
```

## Rules

- Hub sessions are the source of truth for Web, Telegram, and CLI synchronization.
- `codexThreadId` is unique inside the Hub store. One Codex session maps to one Hub session.
- Web uses a path-first sidebar: recent Hub-managed sessions are shortcuts, while the selected workspace directory lists Hub-managed sessions and adoptable native Codex sessions for that cwd.
- Web adoption lists native Codex sessions by selected workspace directory, mirroring Codex resume cwd filtering, and previews the transcript before adoption.
- Web adoption imports the native Codex transcript into Hub messages before opening the session.
- CLI/API adoption registers an explicit Codex thread id under Hub control. Add `--import` or `importTranscript: true` to import the stored transcript into Hub messages.
- Runtime startup resumes an adopted or previously persisted Codex thread before starting the next turn.
- Session runtime config is stored on the Hub session. New sessions inherit `codex.*` settings, creation/adoption flags can override them, and idle sessions can be changed with `PATCH /api/sessions/:id/config` or `cx-tg session-config`.
- Search is enabled by default. `codex.model=auto` and `codex.reasoningEffort=default` leave those choices to Codex; Web displays the inherited values as `Default(<resolved value>)`.
- `permissionMode` accepts `default`, `read-only`, `safe-yolo`, and `yolo`; `--dangerously-bypass-approvals-and-sandbox` maps to `permissionMode=yolo`.
- Deleting a Hub session removes Hub messages, queue, approvals, and events. It leaves the native Codex thread in Codex storage.
