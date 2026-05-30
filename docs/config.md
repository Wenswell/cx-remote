# Configuration

`cx-tg` uses one JSON settings file:

```text
~/.cx-tg/settings.json
```

Set `CX_TG_HOME` to move the whole state directory, or `CX_TG_SETTINGS` to point at a specific settings file.

## Setup

```bash
cx-tg setup
```

`setup` prompts for the high-frequency fields, validates the result, and writes the settings file. Existing secret values are shown as masked values.
It requires an interactive terminal. Use `cx-tg config set` for scripts and automation.

## Config CLI

```bash
cx-tg config path
cx-tg config show
cx-tg config show --resolved
cx-tg config list
cx-tg config get <key>
cx-tg config set <key> <value>
cx-tg config validate
```

`show` reads the settings file. `show --resolved` shows the runtime config after environment overrides and path resolution. Secret values are masked by default; use `--reveal-secrets` only in a trusted terminal.

List values accept comma-separated input or a JSON array:

```bash
cx-tg config set workspace.roots /home/ilove/Documents/repos,/tmp/work
cx-tg config set telegram.allowedUsers '["123456789","987654321"]'
```

## Doctor

```bash
cx-tg doctor
```

Doctor checks these sections:

- Config
- Dependencies
- Workspace
- Storage
- Telegram
- Hub

Local checks run without a live Hub. Hub checks use `/api/health` and `/api/status` when the server is reachable.

## Editable Fields

| Key | Type | Env | Restart |
|---|---:|---|---|
| `server.host` | string | `CX_TG_HOST` | yes |
| `server.port` | number | `CX_TG_PORT` | yes |
| `server.publicUrl` | string | `CX_TG_PUBLIC_URL` | no |
| `server.accessToken` | string | `CX_TG_ACCESS_TOKEN` | yes |
| `workspace.roots` | string[] |  | yes |
| `codex.bin` | string | `CODEX_BIN` | yes |
| `codex.model` | string | `CODEX_MODEL` | no |
| `codex.reasoningEffort` | string | `CODEX_REASONING_EFFORT` | no |
| `codex.approvalPolicy` | enum | `CODEX_APPROVAL_POLICY` | no |
| `codex.sandbox` | enum | `CODEX_SANDBOX` | no |
| `codex.search` | boolean | `CODEX_SEARCH` | no |
| `telegram.enabled` | boolean | `TG_ENABLED` | yes |
| `telegram.botToken` | string | `TG_BOT_TOKEN` | yes |
| `telegram.allowedUsers` | string[] | `TG_ALLOWED_USERS` | yes |
| `telegram.allowedChats` | string[] | `TG_ALLOWED_CHATS` | yes |
| `telegram.requireMention` | boolean |  | yes |
| `approvals.autoApproveCommands` | string[] | `AUTO_APPROVE_COMMANDS` | no |
| `approvals.autoApproveReadonly` | boolean | `AUTO_APPROVE_READONLY` | no |
| `approvals.timeoutMs` | number |  | no |
| `storage.dbPath` | string | `CX_TG_DB_PATH` | yes |
| `log.level` | enum | `LOG_LEVEL` | no |
| `log.file` | string | `LOG_FILE` | yes |
| `log.console` | boolean | `LOG_CONSOLE` | yes |
| `log.prompts` | boolean | `LOG_PROMPTS` | no |

`web.enabled` and `cli.enabled` are visible in `config list` as read-only fields until runtime startup policy consumes them.

## Example

```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 3030,
    "publicUrl": "",
    "accessToken": "generated-token"
  },
  "workspace": {
    "roots": ["/home/ilove/Documents/repos"]
  },
  "agents": {
    "default": "codex",
    "codex": {
      "bin": "codex",
      "model": "",
      "reasoningEffort": "",
      "approvalPolicy": "on-request",
      "sandbox": "workspace-write",
      "search": false
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
    "dbPath": "~/.cx-tg/cx-tg.db"
  },
  "log": {
    "level": "info",
    "file": "logs/cx-tg.log",
    "console": true,
    "prompts": false
  }
}
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
  "value": "gpt-5.1-codex"
}
```

The response includes `restartRequired` for fields that require a Hub restart.
