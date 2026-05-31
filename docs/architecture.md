# Architecture

`cx-tg` is a local-first Control Hub for Codex.

```text
Web / Telegram / CLI
        │
        ▼
ControlHub
  - sessions
  - messages
  - approvals
  - control bindings
  - event stream
        │
        ▼
CodexRuntime
  - codex app-server
  - thread / turn
  - approval RPC
```

## Modules

```text
src/config/       settings loading, defaults, env overrides, validation
src/store/        SQLite persistence
src/runtime/      ControlHub, event bus, permission service
src/agents/codex/ Codex app-server JSON-RPC runtime
src/hub/          HTTP API and SSE
src/web/          built-in browser console
src/controls/     Telegram control adapter
src/cli.ts        terminal CLI client
```

## Data Model

| Entity | Purpose |
|---|---|
| `Session` | Codex working directory, status, thread id, model/sandbox config, active control owner |
| `Message` | user/assistant/tool/system messages for a session |
| `PromptJob` | persisted per-session prompt queue with `queued`, `running`, `done`, `failed`, and `canceled` states |
| `Approval` | pending and resolved Codex approvals or choice requests |
| `ControlBinding` | maps a Web/Telegram/CLI control context to a session |
| `HubEvent` | persisted event stream for Web and Telegram updates |

## Control Flow

1. A control endpoint creates or selects a session.
2. The control sends text to `ControlHub.sendMessage`.
3. `ControlHub` starts or reuses `CodexRuntime`.
4. `CodexRuntime` talks to `codex app-server` over JSON-RPC.
5. Codex events are persisted as messages and published through `EventBus`.
6. Web receives events through SSE.
7. Telegram receives assistant messages and approval requests through its adapter.

## Approval Flow

```text
Codex app-server
      │ requestApproval
      ▼
CodexRuntime
      │
      ▼
PermissionService
      │ create Approval + event
      ▼
Web / Telegram buttons
      │
      ▼
PermissionService.resolveApproval
      │
      ▼
Codex JSON-RPC response
```

Auto approval is intentionally narrow:

- explicit command patterns from `approvals.autoApproveCommands`
- read-only shell commands when `approvals.autoApproveReadonly` is enabled

Pending approvals are expired when their Codex turn can no longer continue, including Hub restart recovery, explicit interrupt, and shutdown. Resolving an already resolved or expired approval returns the stored result.

## HTTP API

The Hub API uses bearer auth and JSON errors:

```json
{
  "error": {
    "message": "Unauthorized"
  }
}
```

Hub request logs include method, path, status, and duration. Query strings are omitted so access tokens are not written to logs.

Main endpoints:

```text
GET    /api/status
POST   /api/auth
GET    /api/workspaces
GET    /api/files
GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
DELETE /api/sessions/:id
PATCH  /api/sessions/:id/control
DELETE /api/sessions/:id/control
GET    /api/sessions/:id/messages
GET    /api/sessions/:id/queue
POST   /api/sessions/:id/messages
POST   /api/sessions/:id/interrupt
GET    /api/approvals
POST   /api/approvals/:id/resolve
GET    /api/settings
PATCH  /api/settings
GET    /api/events
```

API requests are authorized by `Authorization: Bearer <token>` or the Web `cx_tg_auth` HttpOnly cookie. Web calls `POST /api/auth` with the bearer token once, then uses the cookie for REST and EventSource requests. `/api/events` does not accept token query parameters.

`GET /api/sessions/:id` returns a full session snapshot plus `eventCursor`, the latest persisted event id for that session. Web uses that cursor to open one SSE connection per selected session without replaying the already-loaded snapshot.
`GET /api/events` accepts `afterId` and browser `Last-Event-ID` cursors. `Last-Event-ID` takes priority during browser reconnect. Invalid cursor values return `400`.
`GET /api/sessions/:id/queue` returns active prompt jobs by default. Use `status=queued|running|done|failed|canceled|all` to inspect a specific queue state or queue history.
`POST /api/approvals/:id/resolve` accepts `controlType=web|cli|telegram` and records the resolving control source.

## Control Ownership

Control ownership is stored on `Session`:

```text
controlOwner
controlOwnerId
controlLabel
controlLeaseExpiresAt
controlUpdatedAt
```

Web, Telegram, and CLI share observation by default. Any attached control can send while the session is idle. `ControlHub.sendMessage()` records the user message, writes a `PromptJob` to SQLite, and starts the next queued job when the session is free.

Queued jobs survive Hub restart. On startup, leftover `running` jobs are marked `failed` because the owned `codex app-server` process stopped with the Hub; remaining `queued` jobs continue in FIFO order.

`Claim` creates a temporary exclusive lease. While the lease is active, only the matching owner can send. CLI `attach` is shared by default; `cx-tg attach <session-id> --claim` claims a short lease and refreshes it while the process is alive, then releases it on exit.

## First Version Boundaries

Included:

- Web, Telegram, and CLI controls
- SQLite persistence
- Codex only
- local Hub
- SSE updates

Excluded:

- additional IM platforms
- Telegram Mini App
- PTY/xterm terminal mirroring
- multi-machine runner
- Claude hooks
- multi-provider switching

## Why This Shape

The old project bound sessions directly to IM threads. The new design separates `Session` from `ControlBinding`, so the same Codex session can be controlled from Web, Telegram, or CLI.
