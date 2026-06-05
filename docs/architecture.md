# Architecture

`cx-remote` is a local-first Control Hub for Codex. One Hub can aggregate other Hub nodes over the LAN.

```text
Web / Telegram / CLI
        │
        ▼
HubServer
  - optional publicUrl path mount
  - local ControlHub
  - remote node proxy
  - cross-node event fan-in
        │
        ├── local ControlHub
        │     - sessions
        │     - messages
        │     - approvals
        │     - control bindings
        │     - event stream
        │
        └── remote Hub peers
              - proxied session APIs
              - proxied Codex session discovery
              - live event relay
```

## Modules

```text
src/config/       settings loading, defaults, env overrides, validation
src/cluster/      remote Hub clients, node proxying, event fan-in
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
| `CodexSession` | indexed native Codex resume session with cwd key, file path, title, and timestamps |
| `CodexNativeActivity` | latest external native Codex CLI hook activity keyed by Codex thread id |

## Control Flow

1. A control endpoint creates a Hub-managed session, adopts an existing Codex thread, or selects a session.
2. The control sends text to `ControlHub.sendMessage`.
3. `ControlHub` starts or reuses `CodexRuntime`.
4. `CodexRuntime` starts a new Codex thread or resumes the adopted thread, then talks to `codex app-server` over JSON-RPC.
5. Codex events are persisted as messages and published through `EventBus`.
6. Remote node events are relayed into the central Hub event stream with node-qualified session ids.
7. Web receives events through SSE.
8. Telegram receives assistant messages and approval requests through its adapter.

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

The Hub serves API/SSE routes and the built Web app. Vite writes the browser bundle to `dist/web`.

By default Hono serves `/`, `/assets/*`, and `/api/*`. When `server.publicUrl` contains a path, that path becomes the application mount path. With:

```text
server.publicUrl = https://gateway.1662803.xyz/apps/cx-remote
```

the Hub serves:

```text
/apps/cx-remote/             Web
/apps/cx-remote/assets/*     built assets
/apps/cx-remote/api/*        REST and SSE
```

The reverse proxy preserves the prefix. Hono redirects `/apps/cx-remote` to `/apps/cx-remote/`, accepts the bootstrap `?token=<access-token>` URL, sets the Web auth cookie, and redirects to the clean URL before serving the browser console. Web HTML and assets require the token cookie. `/api/*` routes stay JSON-only and never fall through to the Web HTML.

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
GET    /api/codex/sessions
GET    /api/codex/sessions/:threadId/preview
POST   /api/codex/hooks
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

These endpoint paths are relative to the mount path. Under `/apps/cx-remote`, `GET /api/status` becomes `GET /apps/cx-remote/api/status`.

API requests are authorized by `Authorization: Bearer <token>` or the Web `cx_remote_auth` HttpOnly cookie. Web bootstrap accepts `?token=<access-token>` on HTML and asset routes, then stores the cookie and removes the token from the URL. `/api/events` does not accept token query parameters.

`GET /api/status` includes `homePath` so Web can display local paths as `~/...` using the Hub process home directory. It also includes the latest global `eventCursor` for browser notification streams.
`GET /api/status` also returns `nodes[]`, the current node plus any configured peers. `stats` is aggregated across reachable nodes.
`GET /api/workspaces` returns local and remote workspace roots with `nodeId`, `nodeName`, `homePath`, and a stable `workspaceId`.
`GET /api/files?workspaceId=<id>&path=<rel>` browses one workspace root, local or remote.
`GET /api/sessions?nodeId=<node>&cwd=<path>` lists Hub-managed sessions for one node directory, ordered by Hub session `updatedAt`. Without `cwd`, `GET /api/sessions` lists recent sessions across all reachable nodes.
`GET /api/codex/sessions?nodeId=<node>&cwd=<path>` lists Codex resume sessions recorded for one node directory from that node's SQLite index. Results include thread title, timestamps, origin, node metadata, and the Hub session id when that Codex session is already managed.
`GET /api/codex/sessions/:threadId/preview?nodeId=<node>` resolves the thread id through the same index, then reads only that `.jsonl` transcript for a small sample with message count and the Hub session id when already managed.
`POST /api/codex/hooks` accepts Codex hook JSON from `cx-remote notify`, updates native activity by Codex thread id, and publishes `codex.native.activity.updated`.
`GET /api/sessions/:id` returns a full session snapshot plus `eventCursor`, the latest persisted event id for that session. Adopted sessions also include `nativeCodexActivity` when hooks reported activity for the same `codexThreadId`. Remote sessions use namespaced ids like `laptop::550e8400-e29b-41d4-a716-446655440000`.
`POST /api/sessions` and `POST /api/sessions/adopt` accept optional `nodeId` plus optional `config` with `model`, `reasoningEffort`, `permissionMode`, and `search`.
`POST /api/sessions/adopt` accepts `threadId`, `cwd`, optional `title`, and optional `importTranscript`. When `importTranscript` is true, the owning Hub imports the native Codex transcript into Hub messages before opening the session. `codexThreadId` stays unique per node Hub store.
`PATCH /api/sessions/:id/config` updates an idle Hub session runtime config and restarts its idle app-server runtime on the next prompt. Running or queued sessions reject config updates.
`GET /api/events` accepts `afterId` and browser `Last-Event-ID` cursors. `Last-Event-ID` takes priority during browser reconnect. Invalid cursor values return `400`. Remote node events are relayed into this stream while the central Hub is running.
`GET /api/sessions/:id/queue` returns active prompt jobs by default. Use `status=queued|running|done|failed|canceled|all` to inspect a specific queue state or queue history.
`POST /api/approvals/:id/resolve` accepts `controlType=web|cli|telegram` and records the resolving control source.

Web notification preferences are browser-local. The per-session notify switch stores enabled session ids in `localStorage`; while Web is open, a global SSE stream uses the standard browser Notification API when an assistant response is created for any enabled session.

## Gateway Deployment

The gateway deployment keeps Codex runtime state on each node and uses the gateway Hub as an aggregator:

```text
https://gateway.1662803.xyz/apps/cx-remote
  -> Caddy on 10.126.126.1
  -> gateway Hub on 127.0.0.1:3030
  -> peer Hubs on 10.126.126.2:3030 and 10.126.126.3:3030
```

Caddy matches `/apps/cx-remote` and `/apps/cx-remote/*`, then proxies to the gateway Hub while preserving the path prefix. The cx-remote route uses Hub token auth. The gateway Hub has `server.publicUrl=https://gateway.1662803.xyz/apps/cx-remote` and `cluster.peers` entries for the peer LAN URLs.

The gateway Hub sets `workspace.roots=[]` because it is a pure aggregator. Web workspace selection comes from peer Hubs only; the gateway server is not a Codex work node.

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

`Claim` creates a temporary exclusive lease. While the lease is active, only the matching owner can send. CLI `attach` is shared by default; `cx-remote attach <session-id> --claim` claims a short lease and refreshes it while the process is alive, then releases it on exit.

## Session Adoption

Hub sessions are still the synchronization boundary for Web, Telegram, and CLI, and the owning node keeps the real runtime state. The Web sidebar uses three path-oriented sections:

```text
Recent Hub-managed sessions
Selected node workspace directory
Sessions in this directory
  - Hub-managed sessions
  - Native Codex sessions available to adopt
```

Web adoption follows Codex resume cwd filtering inside the selected directory:

```text
GET /api/sessions?nodeId=<node>&cwd=<path>
GET /api/codex/sessions?nodeId=<node>&cwd=<path>
GET /api/codex/sessions/:threadId/preview?nodeId=<node>
pick Codex session
POST /api/sessions/adopt { nodeId, threadId, cwd, importTranscript: true }
```

CLI/API adoption accepts an explicit Codex thread id, and Web/CLI can point that adoption at a remote node:

```text
cx-remote adopt --thread <codex-thread-id> --cwd <path> [--node <node-id>] --import
POST /api/sessions/adopt { nodeId?, threadId, cwd, importTranscript? }
```

Adoption stores the existing Codex thread id on a new Hub session on the owning node. The next prompt resumes that thread with `thread/resume` before `turn/start`. When transcript import is requested, that node Hub copies the native Codex user/assistant messages into Hub messages during adoption.

Deleting a Hub session removes Hub messages, queue, approvals, control state, and events. It leaves the native Codex thread in Codex storage.

## Native Codex Hook Activity

External native Codex CLI runs report lifecycle activity through Codex hooks:

```toml
notify = ["cx-remote", "notify"]

[features]
hooks = true
```

Set `FEISHU_BOT_WEBHOOK` in the environment, or create `~/.cx-remote/notice.env` with `FEISHU_BOT_WEBHOOK=...`. `cx-remote notify` reads one hook payload from stdin, forwards it to `POST /api/codex/hooks`, and sends a Feishu card for main Codex TUI conversations. The Hub resolves the Codex thread id from `transcript_path` metadata when available, and uses `session_id` when transcript metadata is unavailable. The latest activity is stored in `codex_native_activities`.

State mapping:

| Hook event | Native activity state |
|---|---|
| `SessionStart` | `ready` |
| `UserPromptSubmit`, tool hooks | `working` |
| `PermissionRequest` | `waiting_approval` |
| `Stop` | `idle` |

`Stop.last_assistant_message` is stored as the latest native assistant preview. `ready`, `working`, and `waiting_approval` expire to `unknown` after a 60 second hook lease. Native activity is exposed through session detail, CLI detail, Web session header, local SSE replay/live events, and central Hub relayed events. Hub-managed `Session.status` continues to describe the Hub-owned runtime.

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
- remote Hub peer aggregation over LAN
- SSE updates
- explicit native Codex thread adoption

Excluded:

- additional IM platforms
- Telegram Mini App
- PTY/xterm terminal mirroring
- Claude hooks
- multi-provider switching

## Why This Shape

The old project bound sessions directly to IM threads. The current design separates Hub-managed `Session` from `ControlBinding`, so the same Codex thread can be controlled from Web, Telegram, or CLI after creation or adoption.
