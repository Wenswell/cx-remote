import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { ApprovalPolicy, SandboxMode } from '../domain/types.js';

const approvalPolicySchema = z.enum(['untrusted', 'on-failure', 'on-request', 'never']);
const sandboxSchema = z.enum(['read-only', 'workspace-write', 'danger-full-access']);
const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

const settingsSchema = z.object({
  server: z.object({
    host: z.string().min(1).default('0.0.0.0'),
    port: z.coerce.number().int().min(1).max(65535).default(3030),
    publicUrl: z.string().default(''),
    accessToken: z.string().min(16),
  }),
  workspace: z.object({
    roots: z.array(z.string().min(1)).min(1),
  }),
  agents: z.object({
    default: z.literal('codex').default('codex'),
    codex: z.object({
      bin: z.string().min(1).default('codex'),
      model: z.string().default(''),
      reasoningEffort: z.string().default(''),
      approvalPolicy: approvalPolicySchema.default('on-request'),
      sandbox: sandboxSchema.default('workspace-write'),
      search: z.boolean().default(false),
    }),
  }),
  controls: z.object({
    web: z.object({
      enabled: z.boolean().default(true),
    }),
    cli: z.object({
      enabled: z.boolean().default(true),
    }),
    telegram: z.object({
      enabled: z.boolean().default(false),
      botToken: z.string().default(''),
      allowedUsers: z.array(z.string()).default([]),
      allowedChats: z.array(z.string()).default([]),
      requireMention: z.boolean().default(false),
    }),
  }),
  approvals: z.object({
    autoApproveCommands: z.array(z.string()).default([]),
    autoApproveReadonly: z.boolean().default(false),
    timeoutMs: z.number().int().min(10_000).default(5 * 60 * 1000),
  }),
  storage: z.object({
    dbPath: z.string().min(1),
  }),
  log: z.object({
    level: logLevelSchema.default('info'),
    file: z.string().default('logs/cx-tg.log'),
    console: z.boolean().default(true),
    prompts: z.boolean().default(false),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

export interface AppConfig extends Settings {
  home: string;
  settingsPath: string;
}

export type ConfigSource = 'generated' | 'file';

export interface LoadConfigResult {
  config: AppConfig;
  source: ConfigSource;
}

const DEFAULT_HOME = join(homedir(), '.cx-tg');

export function defaultConfigHome(): string {
  return expandHome(process.env.CX_TG_HOME || DEFAULT_HOME);
}

export function defaultSettingsPath(home = defaultConfigHome()): string {
  return join(home, 'settings.json');
}

export function loadConfig(): LoadConfigResult {
  const home = defaultConfigHome();
  const settingsPath = expandHome(process.env.CX_TG_SETTINGS || defaultSettingsPath(home));
  mkdirSync(dirname(settingsPath), { recursive: true });

  let raw: unknown;
  let source: ConfigSource = 'file';
  if (existsSync(settingsPath)) {
    raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } else {
    raw = createDefaultSettings(home);
    writeFileSync(settingsPath, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 });
    source = 'generated';
  }

  const merged = applyEnv(raw);
  const config = settingsSchema.parse(merged) as Settings;
  validateTelegram(config);

  return {
    config: {
      ...config,
      home,
      settingsPath,
      workspace: {
        roots: config.workspace.roots.map((root) => resolve(expandHome(root))),
      },
      storage: {
        dbPath: resolve(expandHome(config.storage.dbPath)),
      },
    },
    source,
  };
}

export function createDefaultSettings(home = defaultConfigHome()): Settings {
  return settingsSchema.parse({
    server: {
      host: '0.0.0.0',
      port: 3030,
      publicUrl: '',
      accessToken: randomBytes(24).toString('hex'),
    },
    workspace: {
      roots: [process.cwd()],
    },
    agents: {
      default: 'codex',
      codex: {
        bin: 'codex',
        model: '',
        reasoningEffort: '',
        approvalPolicy: 'on-request',
        sandbox: 'workspace-write',
        search: false,
      },
    },
    controls: {
      web: { enabled: true },
      cli: { enabled: true },
      telegram: {
        enabled: false,
        botToken: '',
        allowedUsers: [],
        allowedChats: [],
        requireMention: false,
      },
    },
    approvals: {
      autoApproveCommands: [],
      autoApproveReadonly: false,
      timeoutMs: 5 * 60 * 1000,
    },
    storage: {
      dbPath: join(home, 'cx-tg.db'),
    },
    log: {
      level: 'info',
      file: 'logs/cx-tg.log',
      console: true,
      prompts: false,
    },
  });
}

export function expandHome(input: string): string {
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return join(homedir(), input.slice(2));
  return input;
}

export function resolveWorkspacePath(config: Pick<AppConfig, 'workspace'>, input: string): string {
  const raw = expandHome(input);
  const roots = config.workspace.roots.map((root) => resolve(root));
  const candidate = resolve(raw);
  if (roots.some((root) => isPathInside(root, candidate))) return candidate;

  for (const root of roots) {
    const nested = resolve(root, raw);
    if (isPathInside(root, nested)) return nested;
  }

  throw new Error(`Path must be inside one workspace root:\n${roots.join('\n')}`);
}

export function isPathInside(root: string, candidate: string): boolean {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function applyEnv(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const next = structuredClone(raw) as Record<string, unknown>;
  setPath(next, ['server', 'host'], process.env.CX_TG_HOST);
  setPath(next, ['server', 'port'], process.env.CX_TG_PORT);
  setPath(next, ['server', 'publicUrl'], process.env.CX_TG_PUBLIC_URL);
  setPath(next, ['server', 'accessToken'], process.env.CX_TG_ACCESS_TOKEN);
  setPath(next, ['storage', 'dbPath'], process.env.CX_TG_DB_PATH);
  setPath(next, ['agents', 'codex', 'bin'], process.env.CODEX_BIN);
  setPath(next, ['agents', 'codex', 'model'], process.env.CODEX_MODEL);
  setPath(next, ['agents', 'codex', 'reasoningEffort'], process.env.CODEX_REASONING_EFFORT);
  setPath(next, ['agents', 'codex', 'approvalPolicy'], process.env.CODEX_APPROVAL_POLICY as ApprovalPolicy | undefined);
  setPath(next, ['agents', 'codex', 'sandbox'], process.env.CODEX_SANDBOX as SandboxMode | undefined);
  setPath(next, ['agents', 'codex', 'search'], boolEnv(process.env.CODEX_SEARCH));
  setPath(next, ['controls', 'telegram', 'enabled'], boolEnv(process.env.TG_ENABLED));
  setPath(next, ['controls', 'telegram', 'botToken'], process.env.TG_BOT_TOKEN);
  setPath(next, ['controls', 'telegram', 'allowedUsers'], listEnv(process.env.TG_ALLOWED_USERS));
  setPath(next, ['controls', 'telegram', 'allowedChats'], listEnv(process.env.TG_ALLOWED_CHATS));
  setPath(next, ['log', 'level'], process.env.LOG_LEVEL);
  setPath(next, ['log', 'file'], process.env.LOG_FILE);
  setPath(next, ['log', 'console'], boolEnv(process.env.LOG_CONSOLE));
  setPath(next, ['log', 'prompts'], boolEnv(process.env.LOG_PROMPTS));
  setPath(next, ['approvals', 'autoApproveCommands'], listEnv(process.env.AUTO_APPROVE_COMMANDS));
  setPath(next, ['approvals', 'autoApproveReadonly'], boolEnv(process.env.AUTO_APPROVE_READONLY));
  return next;
}

function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
  if (value === undefined || value === '') return;
  let current: Record<string, unknown> = target;
  for (const part of path.slice(0, -1)) {
    const existing = current[part];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[path[path.length - 1]!] = value;
}

function boolEnv(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function listEnv(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function validateTelegram(config: Settings): void {
  if (config.controls.telegram.enabled && !config.controls.telegram.botToken) {
    throw new Error('controls.telegram.botToken is required when Telegram is enabled');
  }
}
