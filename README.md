# cx-tg

Local Codex Control Hub. Use Web, Telegram, or the terminal CLI to control Codex sessions running on this machine.

## Status

First usable rebuild:

- Web control console
- Telegram control and approval buttons
- CLI control commands
- SQLite persistence for sessions, messages, prompt queue, approvals, bindings, and events
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

Run the interactive setup when you want to configure paths, Codex defaults, Web, and Telegram before starting:

```bash
cx-tg setup
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

The token URL is a bootstrap login. Web stores the access token in an HttpOnly cookie and removes the token from the address bar before opening the event stream.

The Web console can:

- create sessions from configured workspace roots
- browse workspace directories
- send messages to Codex
- view session messages, runtime status, Codex config, thread id, and turn id
- view active prompt queue state
- view pending and historical Codex approvals
- stream assistant output while a turn is running
- keep one event stream per selected session and resume from the session event cursor
- take or release exclusive session control
- queue input while a Codex turn is already running; queued prompts survive Hub restart
- rename and delete sessions
- cancel a running turn and queued prompts

## CLI

```bash
cx-tg setup
cx-tg config list
cx-tg config set workspace.roots /home/ilove/Documents/repos
cx-tg config validate
cx-tg status
cx-tg sessions
cx-tg session <session-id>
cx-tg messages <session-id>
cx-tg new --cwd /home/ilove/Documents/repos/cx-tg
cx-tg send <session-id> "check git status"
cx-tg attach <session-id>
cx-tg attach <session-id> --claim
cx-tg stop <session-id>
cx-tg rename <session-id> "new title"
cx-tg delete <session-id>
cx-tg approvals --all
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
/bind <session-id>
/claim
/release
/current
/approvals
/status
/stop
/help
```

Normal text is sent to the bound session. Approval requests are sent with buttons.
Pending approvals expire automatically when the related Codex turn cannot continue after interrupt, shutdown, or Hub restart.

## Configuration

Main file:

```text
~/.cx-tg/settings.json
```

Useful commands:

```bash
cx-tg config path
cx-tg config show
cx-tg config show --resolved
cx-tg config get codex.model
cx-tg config set codex.model gpt-5.1-codex
cx-tg doctor
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
pnpm test
pnpm typecheck
pnpm build
pnpm check
node dist/main.js --help
CX_TG_HOME=/tmp/cx-tg-demo node dist/main.js hub
curl -H "Authorization: Bearer <token>" http://127.0.0.1:3030/api/health
```

## Architecture

See [docs/architecture.md](docs/architecture.md).
