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

## HTTP API

The Hub API uses bearer auth and JSON errors:

```json
{
  "error": {
    "message": "Unauthorized"
  }
}
```

Main endpoints:

```text
GET    /api/status
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
POST   /api/sessions/:id/messages
POST   /api/sessions/:id/interrupt
GET    /api/approvals
POST   /api/approvals/:id/resolve
GET    /api/settings
PATCH  /api/settings
GET    /api/events
```

## Control Ownership

Control ownership is stored on `Session`:

```text
controlOwner
controlOwnerId
controlLabel
controlLeaseExpiresAt
controlUpdatedAt
```

Web, Telegram, and CLI share observation by default. Any attached control can send while the session is idle. If a turn is already running, `ControlHub.sendMessage()` records the user message and places the prompt in the session queue.

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
