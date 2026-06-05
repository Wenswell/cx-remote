# Session Model

`cx-remote` uses node-owned Hub sessions as its product boundary. A Hub session is still the record shared by Web, Telegram, and CLI, but the owning node can be local or remote. The session stores the working directory, runtime config, control owner, prompt queue, approvals, Hub messages, Hub events, and the mapped Codex thread id on that node.

Native Codex sessions become visible in `cx-remote` after adoption on the owning node. Adoption creates a Hub session with an existing `codexThreadId`; future prompts then go through that node Hub and stay synchronized across Web, Telegram, and CLI.

## Flows

```text
Create managed session
  POST /api/sessions { nodeId?, cwd, config? }
  cx-remote new --cwd <path> [--node <node-id>] [runtime flags]
      │
      ▼
  Hub Session with empty codexThreadId
      │ first prompt
      ▼
  codex app-server thread/start
```

```text
Adopt Codex session
  Web: choose node + workspace directory
  Web: GET /api/sessions?nodeId=<node>&cwd=<path>
  Web: GET /api/codex/sessions?nodeId=<node>&cwd=<path>
  Web: GET /api/codex/sessions/:threadId/preview?nodeId=<node>
  Web: choose an unmanaged Codex session recorded for that cwd on that node
  POST /api/sessions/adopt { nodeId, threadId, cwd, config?, importTranscript: true }
  cx-remote adopt --thread <thread-id> --cwd <path> [--node <node-id>] --import [runtime flags]
      │
      ▼
  Hub Session with codexThreadId
      │ first prompt
      ▼
  codex app-server thread/resume
      │
      ▼
  codex app-server turn/start
```

```text
External native Codex CLI activity
  ~/.codex/config.toml
    notify = ["cx-remote", "notify"]
    [features]
    hooks = true
      │ hook JSON on stdin
      ▼
  cx-remote notify
      │ POST /api/codex/hooks
      ▼
  codex_native_activities row by Codex thread id
      │
      ├─ GET /api/sessions/:id -> nativeCodexActivity
      └─ GET /api/events -> codex.native.activity.updated
```

## Rules

- The owning node Hub session is the source of truth for Web, Telegram, and CLI synchronization.
- `codexThreadId` is unique inside the Hub store. One Codex session maps to one Hub session.
- Web uses a node-scoped path-first sidebar: recent sessions are aggregated across nodes, while the selected workspace directory lists Hub-managed sessions and adoptable native Codex sessions for that node and cwd.
- Remote session ids are namespaced as `<nodeId>::<sessionId>`. Local session ids keep their original value.
- Web adoption lists native Codex sessions by selected node and workspace directory, mirroring Codex resume cwd filtering on that node, and previews the transcript before adoption.
- Native Codex session discovery uses a local SQLite index on the owning node. Startup scans `~/.codex/session_index.jsonl` and `~/.codex/sessions/**/*.jsonl` once, indexes Codex user threads, and skips subagent/non-user threads for the default Web adoption list. Web requests the latest 3 native sessions for the selected directory. A watcher batches later file changes into incremental upserts.
- Web adoption imports the native Codex transcript into Hub messages before opening the session.
- CLI/API adoption registers an explicit Codex thread id under Hub control on the selected node. Add `--import` or `importTranscript: true` to import the stored transcript into Hub messages.
- Runtime startup resumes an adopted or previously persisted Codex thread before starting the next turn.
- External native Codex CLI activity is tracked separately from the Hub-managed session status. Hooks update `nativeCodexActivity` for the matching `codexThreadId`; the Hub-owned `Session.status` keeps its existing managed-runtime meaning.
- Hook state mapping is `SessionStart -> ready`, `UserPromptSubmit` and tool hooks -> `working`, `PermissionRequest -> waiting_approval`, and `Stop -> idle`. `Stop.last_assistant_message` is stored as the latest native reply preview.
- `ready`, `working`, and `waiting_approval` use a 60 second lease. When no newer hook arrives in that window, the visible native state becomes `unknown`.
- Native activity is persisted in SQLite and published as `codex.native.activity.updated`. Session detail, CLI `cx-remote session`, Web session header, local SSE, and central Hub relayed SSE expose the same activity object. `cx-remote notify` can also forward the same payload to Feishu when `notifications.feishu.webhook` is set in `~/.cx-remote/settings.json`.
- Session runtime config is stored on the Hub session. New sessions inherit `codex.*` settings, creation/adoption flags can override them, and idle sessions can be changed with `PATCH /api/sessions/:id/config` or `cx-remote session-config`.
- A central Hub can proxy multiple remote Hub peers over the LAN. Remote sessions keep their runtime, queue, approvals, and persistence on the owning node; the central Hub aggregates browsing, switching, and notifications.
- Search is enabled by default. `codex.model=auto` and `codex.reasoningEffort=default` leave those choices to Codex; Web displays the inherited values as `Default(<resolved value>)`.
- `permissionMode` accepts `default`, `read-only`, `safe-yolo`, and `yolo`; `--dangerously-bypass-approvals-and-sandbox` maps to `permissionMode=yolo`.
- Deleting a Hub session removes Hub messages, queue, approvals, and events. It leaves the native Codex thread in Codex storage.
