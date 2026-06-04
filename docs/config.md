# Configuration

`cx-remote` uses one JSON settings file:

```text
~/.cx-remote/settings.json
```

Set `CX_REMOTE_HOME` to move the whole state directory, or `CX_REMOTE_SETTINGS` to point at a specific settings file.

## Setup

```bash
cx-remote setup
```

`setup` prompts for the high-frequency fields, validates the result, and writes the settings file. Existing secret values are shown as masked values.
It requires an interactive terminal. Use `cx-remote config set` for scripts and automation.

## Config CLI

```bash
cx-remote config path
cx-remote config show
cx-remote config show --resolved
cx-remote config list
cx-remote config get <key>
cx-remote config set <key> <value>
cx-remote config validate
```

`show` reads the settings file. `show --resolved` shows the runtime config after environment overrides and path resolution. Secret values are masked by default; use `--reveal-secrets` only in a trusted terminal.

List values accept comma-separated input or a JSON array. JSON-valued fields accept a JSON object or array:

```bash
cx-remote config set workspace.roots /home/ilove/Documents/repos,/tmp/work
cx-remote config set telegram.allowedUsers '["123456789","987654321"]'
cx-remote config set cluster.peers '[{"id":"laptop","name":"My Laptop","url":"http://10.0.0.12:3030","accessToken":"..."}]'
```

## Doctor

```bash
cx-remote doctor
```

Doctor checks these sections:

- Config
- Dependencies
- Workspace
- Storage
- Telegram
- Hub

Local checks run without a live Hub. Hub checks use `/api/health` and `/api/status` when the server is reachable.

## Public URL

`server.publicUrl` is the canonical external Web root. It must be an absolute URL. Query and hash components are invalid.

When the URL has a path, Hub uses that path as its mount path for Web, static assets, REST APIs, and SSE. For example:

```bash
cx-remote config set server.publicUrl https://gateway.1662803.xyz/apps/cx-remote
```

The Web page is served at `/apps/cx-remote/`, assets at `/apps/cx-remote/assets/*`, and APIs at `/apps/cx-remote/api/*`. Reverse proxies must preserve that prefix.

## Editable Fields

| Key | Type | Env | Restart |
|---|---:|---|---|
| `server.host` | string | `CX_REMOTE_HOST` | yes |
| `server.port` | number | `CX_REMOTE_PORT` | yes |
| `server.publicUrl` | absolute URL or empty | `CX_REMOTE_PUBLIC_URL` | no |
| `server.accessToken` | string | `CX_REMOTE_ACCESS_TOKEN` | yes |
| `cluster.name` | string |  | yes |
| `cluster.peers` | json |  | yes |
| `workspace.roots` | string[] |  | yes |
| `codex.bin` | string | `CODEX_BIN` | yes |
| `codex.model` | enum | `CODEX_MODEL` | no |
| `codex.reasoningEffort` | enum | `CODEX_REASONING_EFFORT` | no |
| `codex.permissionMode` | enum | `CODEX_PERMISSION_MODE` | no |
| `codex.search` | boolean | `CODEX_SEARCH` | no |
| `telegram.enabled` | boolean | `TG_ENABLED` | yes |
| `telegram.botToken` | string | `TG_BOT_TOKEN` | yes |
| `telegram.allowedUsers` | string[] | `TG_ALLOWED_USERS` | yes |
| `telegram.allowedChats` | string[] | `TG_ALLOWED_CHATS` | yes |
| `telegram.requireMention` | boolean |  | yes |
| `approvals.autoApproveCommands` | string[] | `AUTO_APPROVE_COMMANDS` | no |
| `approvals.autoApproveReadonly` | boolean | `AUTO_APPROVE_READONLY` | no |
| `approvals.timeoutMs` | number |  | no |
| `storage.dbPath` | string | `CX_REMOTE_DB_PATH` | yes |
| `log.level` | enum | `LOG_LEVEL` | no |
| `log.file` | string | `LOG_FILE` | yes |
| `log.console` | boolean | `LOG_CONSOLE` | yes |
| `log.prompts` | boolean | `LOG_PROMPTS` | no |

`web.enabled` and `cli.enabled` are visible in `config list` as read-only fields until runtime startup policy consumes them. The Web app is built by Vite into `dist/web`; Hub serving is controlled by the `server.*` settings.

## Example

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3030,
    "publicUrl": "https://gateway.1662803.xyz/apps/cx-remote",
    "accessToken": "generated-token"
  },
  "cluster": {
    "name": "server-node",
    "peers": [
      {
        "id": "mac",
        "name": "Mac",
        "url": "http://10.126.126.2:3030",
        "accessToken": "mac-token"
      },
      {
        "id": "mint",
        "name": "Linux Mint",
        "url": "http://10.126.126.3:3030",
        "accessToken": "mint-token"
      }
    ]
  },
  "workspace": {
    "roots": []
  },
  "agents": {
    "default": "codex",
    "codex": {
      "bin": "codex",
      "model": "auto",
      "reasoningEffort": "default",
      "permissionMode": "default",
      "search": true
    }
  },
  "controls": {
    "web": { "enabled": true },
    "cli": { "enabled": true },
    "telegram": {
      "enabled": false,
      "botToken": "",
      "allowedUsers": [],
      "allowedChats": [],
      "requireMention": false
    }
  },
  "approvals": {
    "autoApproveCommands": [],
    "autoApproveReadonly": false,
    "timeoutMs": 300000
  },
  "storage": {
    "dbPath": "~/.cx-remote/cx-remote.db"
  },
  "log": {
    "level": "info",
    "file": "logs/cx-remote.log",
    "console": true,
    "prompts": false
  }
}
```

Each peer entry points at another `cx-remote hub` instance. The central Hub keeps browsing, switching, and notifications in one Web UI, while the remote node keeps its own Codex runtime, queue, approvals, and persistence.

Peer URLs are Hub roots. They can be bare LAN origins such as `http://10.126.126.3:3030` or path-based Hub roots such as `https://gateway.1662803.xyz/apps/cx-remote-peer`.

For the `gateway.1662803.xyz/apps/cx-remote` deployment, the gateway node uses:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
cx-remote config set cluster.name gateway
cx-remote config set server.host 127.0.0.1
cx-remote config set server.port 3030
cx-remote config set server.publicUrl https://gateway.1662803.xyz/apps/cx-remote
cx-remote config set server.accessToken '<central-token>'
cx-remote config set workspace.roots '[]'
cx-remote config set cluster.peers '[{"id":"mac","name":"Mac","url":"http://10.126.126.2:3030","accessToken":"<mac-token>"},{"id":"mint","name":"Linux Mint","url":"http://10.126.126.3:3030","accessToken":"<mint-token>"}]'
```

`workspace.roots=[]` makes the gateway Hub a pure aggregator. It proxies peer workspaces, sessions, approvals, and events while keeping the gateway server out of Web workspace selection.

Each peer node keeps `cluster.peers` empty, sets its own workspace roots, and listens on the EasyTier LAN:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
cx-remote config set server.host 0.0.0.0
cx-remote config set server.port 3030
cx-remote config set server.accessToken '<peer-token>'
cx-remote config set cluster.peers '[]'
cx-remote config set workspace.roots /path/to/repos
```

## Web Settings API

Authenticated endpoints:

```text
GET /api/settings
PATCH /api/settings
```

`GET` returns masked settings and field metadata. `PATCH` accepts one setting update:

```json
{
  "key": "codex.model",
  "value": "gpt-5.5"
}
```

The response includes `restartRequired` for fields that require a Hub restart.

## Session Runtime

`codex.*` settings are defaults for new Hub sessions. Each session stores its own runtime config snapshot, so later default changes do not rewrite existing Hub sessions.

`cluster.name` is the label shown in Web for this node. `cluster.peers` defines the remote Hub nodes that should be aggregated into the same Web and API surface.

Use per-session flags for one session:

```bash
cx-remote new --cwd <path> --search
cx-remote new --cwd <path> --node laptop --search
cx-remote new --cwd <path> --model gpt-5.5 --reasoning-effort high
cx-remote adopt --thread <codex-thread-id> --cwd <path> --node laptop --permission-mode safe-yolo
cx-remote session-config <session-id> --search --permission-mode yolo
```

Search is enabled by default; `--no-search` disables it for one session. Model choices are `auto`, `gpt-5.5`, and `gpt-5.4`. Reasoning effort choices are `default`, `xhigh`, `high`, and `medium`. Web labels `auto` and `default` as `Default(<resolved value>)` using Codex's inherited runtime defaults.

Permission modes are `default`, `read-only`, `safe-yolo`, and `yolo`. The dangerous Codex flag is accepted as a `yolo` shortcut.
