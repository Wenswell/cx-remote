# Configuration

Main config path:

```text
~/.cx-tg/settings.json
```

The file is generated on first `cx-tg hub` start.

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

## Workspace Roots

`workspace.roots` limits which directories can be used for sessions.

Web and Telegram can pass either:

- an absolute path under one root
- a relative path resolved under a root

## Access Token

`server.accessToken` protects API and Web data.

Web URL:

```text
http://127.0.0.1:3030/?token=<access-token>
```

CLI reads the same settings file, so no token argument is needed for local CLI use.

## Environment Overrides

Environment variables override selected settings:

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
