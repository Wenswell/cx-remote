# Session Model

`cx-tg` uses Hub-managed sessions as its product boundary. A Hub session is the record shared by Web, Telegram, and CLI. It stores the working directory, runtime config, control owner, prompt queue, approvals, Hub messages, Hub events, and the mapped Codex thread id.

Native Codex threads become visible in `cx-tg` after adoption. Adoption creates a Hub session with an existing `codexThreadId`; future prompts then go through the Hub and stay synchronized across Web, Telegram, and CLI.

## Flows

```text
Create managed session
  POST /api/sessions
  cx-tg new --cwd <path>
      │
      ▼
  Hub Session with empty codexThreadId
      │ first prompt
      ▼
  codex app-server thread/start
```

```text
Adopt Codex thread
  POST /api/sessions/adopt
  cx-tg adopt --thread <thread-id> --cwd <path>
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
- `codexThreadId` is unique inside the Hub store. One Codex thread maps to one Hub session.
- Adoption registers an existing Codex thread under Hub control. Hub history starts at adoption; previous native Codex transcript remains in Codex storage.
- Runtime startup resumes an adopted or previously persisted Codex thread before starting the next turn.
- Deleting a Hub session removes Hub messages, queue, approvals, and events. It leaves the native Codex thread in Codex storage.
