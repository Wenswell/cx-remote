# cx-tg

Local Codex Control Hub. Use Web, Telegram, or the terminal CLI to control Codex sessions running on this machine.

## Status

First usable rebuild:

- Web control console
- Telegram control and approval buttons
- CLI control commands
- SQLite persistence for sessions, messages, approvals, bindings, and events
- Codex execution through `codex app-server`
- Telegram is the only IM control in this version

## Install

```bash
pnpm install
pnpm build
```

The project requires Node.js 25 or newer because it uses `node:sqlite`.

## Start

```bash
pnpm start
```

Equivalent:

```bash
cx-tg hub
```

On first start, the app creates:

```text
~/.cx-tg/settings.json
~/.cx-tg/cx-tg.db
```

The terminal prints the Web URL, token, and settings path.

## Web

Open:

```text
http://127.0.0.1:3030/?token=<access-token>
```

The Web console can:

- create sessions from workspace paths
- send messages to Codex
- view session messages and status
- approve or deny pending Codex requests
- interrupt a running turn

## CLI

```bash
cx-tg status
cx-tg sessions
cx-tg new --cwd /home/ilove/Documents/repos/cx-tg
cx-tg send <session-id> "check git status"
cx-tg stop <session-id>
cx-tg approve <approval-id> approved
cx-tg doctor
```

`cc-hub` is kept as an alias for the same binary.

## Telegram

Enable Telegram in `~/.cx-tg/settings.json`:

```json
{
  "controls": {
    "telegram": {
      "enabled": true,
      "botToken": "123:abc",
      "allowedUsers": ["123456789"],
      "allowedChats": [],
      "requireMention": false
    }
  }
}
```

Telegram commands:

```text
/new <path>
/sessions
/use <session-id>
/status
/stop
/help
```

Normal text is sent to the bound session. Approval requests are sent with buttons.

## Configuration

Main file:

```text
~/.cx-tg/settings.json
```

Environment variables can override selected fields:

```text
CX_TG_HOME
CX_TG_SETTINGS
CX_TG_HOST
CX_TG_PORT
CX_TG_PUBLIC_URL
CX_TG_ACCESS_TOKEN
CX_TG_DB_PATH
CODEX_BIN
CODEX_MODEL
CODEX_REASONING_EFFORT
CODEX_APPROVAL_POLICY
CODEX_SANDBOX
CODEX_SEARCH
TG_ENABLED
TG_BOT_TOKEN
TG_ALLOWED_USERS
TG_ALLOWED_CHATS
LOG_LEVEL
LOG_FILE
LOG_CONSOLE
LOG_PROMPTS
AUTO_APPROVE_COMMANDS
AUTO_APPROVE_READONLY
```

See [docs/config.md](docs/config.md) for the full structure.

## Verification

```bash
pnpm typecheck
pnpm build
node dist/main.js --help
CX_TG_HOME=/tmp/cx-tg-demo node dist/main.js hub
curl -H "Authorization: Bearer <token>" http://127.0.0.1:3030/api/health
```

## Architecture

See [docs/architecture.md](docs/architecture.md).
