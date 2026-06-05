# cx-remote

Local Codex Control Hub. Use Web, Telegram, or the terminal CLI to control Hub-managed Codex sessions on this machine.

## Status

First usable rebuild:

- Web control console
- Telegram control and approval buttons
- CLI control commands
- SQLite persistence for Hub sessions, messages, prompt queue, approvals, bindings, and events
- Codex execution through `codex app-server`
- adoption of existing native Codex sessions into Hub-managed sessions
- native Codex CLI hook activity shown on adopted Hub sessions
- Telegram is the only IM control in this version

## Install

```bash
pnpm install
pnpm build
```

The project requires Node.js 25 or newer because it uses `node:sqlite`.
`pnpm build` runs the Vite Web build into `dist/web` and the Node server build into `dist`.

Install globally from GitHub:

```bash
pnpm add -g github:Wenswell/cx-remote
cx-remote --help
```

Stable release install:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
```

When pnpm reports that the global bin directory is outside `PATH`, run `pnpm setup`, open a new shell, and run the install command again.

Install from a local checkout:

```bash
pnpm add -g /path/to/cx-remote
```

Development commands:

```bash
pnpm dev:hub
pnpm dev:web
```

`pnpm dev:web` serves the Vite + Shoelace Web app on `0.0.0.0` and proxies `/api` to the local Hub at `127.0.0.1:3030`.

## Start

```bash
pnpm start
```

Equivalent:

```bash
cx-remote hub
```

Run the interactive setup when you want to configure paths, Codex defaults, Web, and Telegram before starting:

```bash
cx-remote setup
```

On first start, the app creates:

```text
~/.cx-remote/settings.json
~/.cx-remote/cx-remote.db
```

The terminal prints the Web URL, token, and settings path.

## Web

Open:

```text
http://127.0.0.1:3030/?token=<access-token>
```

When `server.publicUrl` includes a path, that path is the Hub mount path. For a gateway deployment:

```bash
cx-remote config set server.publicUrl https://gateway.1662803.xyz/apps/cx-remote
cx-remote hub
```

Open:

```text
https://gateway.1662803.xyz/apps/cx-remote/?token=<access-token>
```

The token URL is a bootstrap login. Hub stores the access token in an HttpOnly cookie and redirects to the clean Web URL before serving the console, assets, REST APIs, and EventSource streams. Opening Web without a valid token cookie returns `401`.
The browser console is a Vite + Shoelace app served from `dist/web` by the Hub.
Web shows recently used Hub-managed sessions at the top of the sidebar. The workspace panel selects a directory, then shows Hub-managed sessions for that directory and native Codex sessions that can be adopted into Hub. On mobile, the sidebar opens from the top-left sessions button.
Native Codex user sessions are indexed on each owning node in `~/.cx-remote/cx-remote.db`. Startup builds a baseline from `~/.codex/session_index.jsonl` and `~/.codex/sessions/**/*.jsonl`; a file watcher batches later changes into small SQLite updates, so Web path changes query the local index instead of scanning the full Codex sessions tree. Subagent and non-user threads stay out of the default Web adoption list, and Web requests the latest 3 native sessions for the selected directory.

The Web console can:

- create Hub-managed sessions from configured workspace roots
- browse Hub-managed sessions under the selected workspace directory
- preview native Codex sessions under the selected workspace directory, then adopt one into Hub with its transcript imported
- browse workspace directories
- send messages to Codex
- view Hub messages, runtime status, Codex config, thread id, and turn id
- view native Codex CLI hook activity for adopted sessions
- view active prompt queue state
- view pending and historical Codex approvals
- stream assistant output while a turn is running
- keep one event stream per selected session and resume from the session event cursor
- take or release exclusive session control
- queue input while a Codex turn is already running; queued prompts survive Hub restart
- rename Hub sessions and delete them from the Hub store
- cancel a running turn and queued prompts
- enable browser notifications per Hub session for assistant responses while Web is open

## CLI

```bash
cx-remote setup
cx-remote config list
cx-remote config set workspace.roots /home/ilove/Documents/repos
cx-remote config validate
cx-remote status
cx-remote sessions
cx-remote session <session-id>
cx-remote messages <session-id>
cx-remote new --cwd /home/ilove/Documents/repos/cx-remote
cx-remote adopt --thread <codex-thread-id> --cwd /home/ilove/Documents/repos/cx-remote --import
cx-remote codex-hook < hook-payload.json
cx-remote session-config <session-id> --search --permission-mode yolo
cx-remote send <session-id> "check git status"
cx-remote attach <session-id>
cx-remote attach <session-id> --claim
cx-remote stop <session-id>
cx-remote rename <session-id> "new title"
cx-remote delete <session-id>
cx-remote approvals --all
cx-remote approve <approval-id> approved
cx-remote doctor
```

Web session selection follows a path-first flow: choose a workspace directory, select an existing Hub-managed session in that directory, preview and adopt one of the Codex sessions recorded for that directory, or create a new Hub session there. Web adoption imports the native Codex transcript into Hub messages before opening the session. `cx-remote adopt` creates a Hub session that points to an explicit Codex thread id for scripts and terminal use; add `--import` to import the stored transcript. Future prompts go through the Hub, so Web, Telegram, and CLI stay synchronized. Deleting the Hub session removes Hub data and leaves the native Codex thread in Codex storage.

External native Codex CLI runs can report activity for an adopted thread through Codex hooks:

```toml
# One hook command: argv[0] = cx-remote, argv[1] = codex-hook
notify = ["cx-remote", "codex-hook"]

[features]
hooks = true
```

`cx-remote codex-hook` reads the Codex hook JSON from stdin and sends it to the local Hub. Session detail then shows `ready`, `working`, `waiting_approval`, `idle`, or `unknown` as `nativeCodexActivity`. Active hook states expire to `unknown` after 60 seconds without a newer hook event. Hub-managed runtime status keeps its existing `idle`, `running`, `waiting_approval`, and `error` states.

`cx-remote` stores session runtime as `permissionMode`, `search`, model, and reasoning effort:

```bash
cx-remote new --cwd <path> --search
cx-remote new --cwd <path> --model gpt-5.5 --reasoning-effort high
cx-remote new --cwd <path> --permission-mode read-only
cx-remote adopt --thread <codex-thread-id> --cwd <path> --import --permission-mode safe-yolo
cx-remote session-config <session-id> --search --permission-mode yolo
```

Search is enabled by default. Use `--no-search` to disable it for one session. `model=auto` and `reasoningEffort=default` leave those choices to Codex; Web labels them as `Default(<resolved value>)`. `--dangerously-bypass-approvals-and-sandbox` is accepted as a `permissionMode=yolo` shortcut. At runtime, Hub starts `codex app-server` with `--search` when search is enabled, then sends mode-derived `approvalPolicy` and `permissions` through `thread/start`, `thread/resume`, and `turn/start`. Existing sessions can be updated while idle; queued or running sessions reject config updates.

## LAN Gateway

Recommended topology for `gateway.1662803.xyz/apps/cx-remote`:

```text
Browser
  -> gateway.1662803.xyz/apps/cx-remote
  -> Caddy on 10.126.126.1
  -> central cx-remote Hub on 127.0.0.1:3030
  -> peer Hubs on 10.126.126.2:3030 and 10.126.126.3:3030
```

Install the same global CLI on every Hub node:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
cx-remote --help
```

Central Hub on the gateway server:

```bash
cx-remote config set cluster.name gateway
cx-remote config set server.host 127.0.0.1
cx-remote config set server.port 3030
cx-remote config set server.publicUrl https://gateway.1662803.xyz/apps/cx-remote
cx-remote config set server.accessToken '<central-token>'
cx-remote config set workspace.roots '[]'
cx-remote config set cluster.peers '[{"id":"mac","name":"Mac","url":"http://10.126.126.2:3030","accessToken":"<mac-token>"},{"id":"mint","name":"Linux Mint","url":"http://10.126.126.3:3030","accessToken":"<mint-token>"}]'
cx-remote hub
```

`workspace.roots=[]` makes the gateway Hub a pure aggregator. Web will show peer workspaces and sessions, while the gateway server stays out of workspace selection.
Directory browsing through the gateway keeps the peer workspace identity. Web uses that peer `nodeId` when it lists Hub-managed sessions and native Codex resume sessions for the selected directory.

Peer Hub on `10.126.126.2`:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
cx-remote config set cluster.name mac
cx-remote config set server.host 0.0.0.0
cx-remote config set server.port 3030
cx-remote config set server.accessToken '<mac-token>'
cx-remote config set cluster.peers '[]'
cx-remote config set workspace.roots /home/wswensw
cx-remote hub
```

Peer Hub on `10.126.126.3`:

```bash
pnpm add -g github:Wenswell/cx-remote#v0.1.4
cx-remote config set cluster.name mint
cx-remote config set server.host 0.0.0.0
cx-remote config set server.port 3030
cx-remote config set server.accessToken '<mint-token>'
cx-remote config set cluster.peers '[]'
cx-remote config set workspace.roots /home/ilove/Documents/repos
cx-remote hub
```

Caddy keeps the `/apps/cx-remote` prefix when proxying:

```caddyfile
gateway.1662803.xyz {
  @cx_remote path /apps/cx-remote /apps/cx-remote/*
  handle @cx_remote {
    reverse_proxy 127.0.0.1:3030
  }

  handle {
    reverse_proxy 127.0.0.1:4318
  }
}
```

Use the existing gateway public routes before the final `handle` when this snippet is merged into the live Caddyfile. The `/apps/cx-remote` route uses cx-remote token auth; the rest of gateway can keep its existing Caddy Basic Auth policy.

## Telegram

Enable Telegram in `~/.cx-remote/settings.json`:

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
~/.cx-remote/settings.json
```

Useful commands:

```bash
cx-remote config path
cx-remote config show
cx-remote config show --resolved
cx-remote config get codex.model
cx-remote config set codex.model gpt-5.5
cx-remote doctor
```

Environment variables can override selected fields:

```text
CX_REMOTE_HOME
CX_REMOTE_SETTINGS
CX_REMOTE_HOST
CX_REMOTE_PORT
CX_REMOTE_PUBLIC_URL
CX_REMOTE_ACCESS_TOKEN
CX_REMOTE_DB_PATH
CODEX_BIN
CODEX_MODEL
CODEX_REASONING_EFFORT
CODEX_PERMISSION_MODE
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
CX_REMOTE_HOME=/tmp/cx-remote-demo node dist/main.js hub
curl -H "Authorization: Bearer <token>" http://127.0.0.1:3030/api/health
```

## Architecture

See [docs/architecture.md](docs/architecture.md) and [docs/session-model.md](docs/session-model.md).
