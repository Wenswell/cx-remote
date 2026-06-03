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
src/web/          Vite + Shoelace browser console
src/controls/     Telegram control adapter
src/cli.ts        terminal CLI client
```

## Data Model

| Entity | Purpose |
|---|---|
| `Session` | Hub-managed record with Codex working directory, status, unique thread id, runtime config, active control owner |
| `Message` | user/assistant/tool/system messages for a session |
| `PromptJob` | persisted per-session prompt queue with `queued`, `running`, `done`, `failed`, and `canceled` states |
| `Approval` | pending and resolved Codex approvals or choice requests |
| `ControlBinding` | maps a Web/Telegram/CLI control context to a session |
| `HubEvent` | persisted event stream for Web and Telegram updates |

## Control Flow

1. A control endpoint creates a Hub-managed session, adopts an existing Codex thread, or selects a session.
2. The control sends text to `ControlHub.sendMessage`.
3. `ControlHub` starts or reuses `CodexRuntime`.
4. `CodexRuntime` starts a new Codex thread or resumes the adopted thread, then talks to `codex app-server` over JSON-RPC.
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

The Hub serves API/SSE routes and the built Web app. Vite writes the browser bundle to `dist/web`; Hono serves `/`, `/assets/*`, and HTML page fallbacks from that directory. `/api/*` routes stay JSON-only and never fall through to the Web HTML.

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
POST   /api/sessions/adopt
GET    /api/sessions/:id
PATCH  /api/sessions/:id
PATCH  /api/sessions/:id/config
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

`GET /api/status` includes `homePath` so Web can display local paths as `~/...` using the Hub process home directory. It also includes the latest global `eventCursor` for browser notification streams.
`GET /api/sessions/:id` returns a full session snapshot plus `eventCursor`, the latest persisted event id for that session. Web uses that cursor to open one SSE connection per selected session without replaying the already-loaded snapshot.
`POST /api/sessions` and `POST /api/sessions/adopt` accept optional `config` with `model`, `reasoningEffort`, `permissionMode`, and `search`.
`POST /api/sessions/adopt` accepts `threadId`, `cwd`, and optional `title`, then creates a Hub-managed session mapped to that native Codex thread. `codexThreadId` is unique in the Hub store.
`PATCH /api/sessions/:id/config` updates an idle Hub session runtime config and restarts its idle app-server runtime on the next prompt. Running or queued sessions reject config updates.
`GET /api/events` accepts `afterId` and browser `Last-Event-ID` cursors. `Last-Event-ID` takes priority during browser reconnect. Invalid cursor values return `400`.
`GET /api/sessions/:id/queue` returns active prompt jobs by default. Use `status=queued|running|done|failed|canceled|all` to inspect a specific queue state or queue history.
`POST /api/approvals/:id/resolve` accepts `controlType=web|cli|telegram` and records the resolving control source.

Web notification preferences are browser-local. The per-session notify switch stores enabled session ids in `localStorage`; while Web is open, a global SSE stream uses the standard browser Notification API when an assistant response is created for any enabled session.

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

## Session Adoption

Hub sessions are the synchronization boundary for Web, Telegram, and CLI. Native Codex threads are adopted explicitly:

```text
cx-tg adopt --thread <codex-thread-id> --cwd <path>
POST /api/sessions/adopt
```

Adoption stores the existing Codex thread id on a new Hub session. The next prompt resumes that thread with `thread/resume` before `turn/start`. Hub history starts at adoption; previous native Codex transcript remains in Codex storage.

Deleting a Hub session removes Hub messages, queue, approvals, control state, and events. It leaves the native Codex thread in Codex storage.

## Codex Runtime Flags

Hub sessions store a Codex runtime config snapshot. `codex.*` settings provide defaults for new sessions; session creation, adoption, and idle-session config updates can override those defaults.

Session runtime fields:

```text
--model gpt-5.5
  -> config.model = gpt-5.5

--reasoning-effort high
  -> config.reasoningEffort = high

--search
  -> config.search = true

--no-search
  -> config.search = false

--permission-mode yolo
  -> config.permissionMode = yolo

--dangerously-bypass-approvals-and-sandbox
  -> config.permissionMode = yolo
```

`model=auto` and `reasoningEffort=default` omit those app-server parameters and inherit Codex's runtime defaults. Web displays those inherited values as `Default(<resolved value>)`. Search is enabled by default. `CodexRuntime` passes `search` to the top-level `codex app-server` process. It sends mode-derived `approvalPolicy` and v2 `permissions` through `thread/start`, `thread/resume`, and `turn/start`.

Permission mode mapping:

| Permission mode | Approval policy | App-server permissions |
|---|---|---|
| `default` | `on-request` | `:workspace` |
| `read-only` | `never` | `:read-only` |
| `safe-yolo` | `on-failure` | `:workspace` |
| `yolo` | `never` | `:danger-full-access` |

Logical behavior:

| Permission mode | Behavior |
|---|---|
| `default` | Workspace access with model-requested user approvals for higher-risk actions. |
| `read-only` | Read-only access; write attempts are rejected. |
| `safe-yolo` | Workspace access; failed sandboxed commands can request escalation. |
| `yolo` | Full filesystem/process access; approvals are bypassed. |

## First Version Boundaries

Included:

- Web, Telegram, and CLI controls
- SQLite persistence
- Codex only
- local Hub
- SSE updates
- explicit native Codex thread adoption

Excluded:

- additional IM platforms
- Telegram Mini App
- PTY/xterm terminal mirroring
- multi-machine runner
- Claude hooks
- multi-provider switching

## Why This Shape

The old project bound sessions directly to IM threads. The current design separates Hub-managed `Session` from `ControlBinding`, so the same Codex thread can be controlled from Web, Telegram, or CLI after creation or adoption.
