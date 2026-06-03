import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS, type CodexPermissionMode } from '../domain/types.js';
import { SETTING_FIELDS, findSettingField, type SettingField } from './fields.js';

const permissionModeSchema = z.enum(['default', 'read-only', 'safe-yolo', 'yolo']);
const codexModelSchema = z.enum(['auto', ...CODEX_MODEL_OPTIONS]);
const codexReasoningEffortSchema = z.enum(['default', ...CODEX_REASONING_EFFORT_OPTIONS]);
const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
const clusterPeerSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
  name: z.string().min(1),
  url: z.string().url(),
  accessToken: z.string().min(1),
});
const publicUrlSchema = z.union([z.literal(''), z.string().url()]);

export const settingsSchema = z.object({
  server: z.object({
    host: z.string().min(1).default('0.0.0.0'),
    port: z.coerce.number().int().min(1).max(65535).default(3030),
    publicUrl: publicUrlSchema.default(''),
    accessToken: z.string().min(16),
  }),
  cluster: z.object({
    name: z.string().min(1).default(hostname()),
    peers: z.array(clusterPeerSchema).default([]),
  }),
  workspace: z.object({
    roots: z.array(z.string().min(1)).min(1),
  }),
  agents: z.object({
    default: z.literal('codex').default('codex'),
    codex: z.object({
      bin: z.string().min(1).default('codex'),
      model: codexModelSchema.default('auto'),
      reasoningEffort: codexReasoningEffortSchema.default('default'),
      permissionMode: permissionModeSchema.default('default'),
      search: z.boolean().default(true),
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
export type ConfigPatch = Partial<{
  server: Partial<Settings['server']>;
  cluster: Partial<Settings['cluster']>;
  workspace: Partial<Settings['workspace']>;
  agents: Partial<{
    default: Settings['agents']['default'];
    codex: Partial<Settings['agents']['codex']>;
  }>;
  controls: Partial<{
    web: Partial<Settings['controls']['web']>;
    cli: Partial<Settings['controls']['cli']>;
    telegram: Partial<Settings['controls']['telegram']>;
  }>;
  approvals: Partial<Settings['approvals']>;
  storage: Partial<Settings['storage']>;
  log: Partial<Settings['log']>;
}>;

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

export function getSettingsPath(): string {
  return expandHome(process.env.CX_TG_SETTINGS || defaultSettingsPath());
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
  const config = validateSettings(merged);

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

export function readSettings(): Settings {
  const settingsPath = getSettingsPath();
  if (!existsSync(settingsPath)) {
    return createDefaultSettings();
  }
  const raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
  return validateSettings(raw);
}

export function writeSettings(settings: Settings, settingsPath = getSettingsPath()): void {
  const parsed = validateSettings(settings);
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
}

export function patchSettings(patch: ConfigPatch): Settings {
  const current = readSettings();
  const next: Settings = {
    ...current,
    ...patch,
    server: { ...current.server, ...patch.server },
    cluster: {
      ...current.cluster,
      ...patch.cluster,
      peers: patch.cluster?.peers ?? current.cluster.peers,
    },
    workspace: { ...current.workspace, ...patch.workspace },
    agents: {
      ...current.agents,
      ...patch.agents,
      codex: { ...current.agents.codex, ...patch.agents?.codex },
    },
    controls: {
      ...current.controls,
      ...patch.controls,
      web: { ...current.controls.web, ...patch.controls?.web },
      cli: { ...current.controls.cli, ...patch.controls?.cli },
      telegram: { ...current.controls.telegram, ...patch.controls?.telegram },
    },
    approvals: { ...current.approvals, ...patch.approvals },
    storage: { ...current.storage, ...patch.storage },
    log: { ...current.log, ...patch.log },
  };
  const parsed = validateSettings(next);
  writeSettings(parsed);
  return parsed;
}

export function validateSettings(input: unknown): Settings {
  const settings = settingsSchema.parse(input) as Settings;
  validatePublicUrl(settings);
  validateTelegram(settings);
  validateCluster(settings);
  return settings;
}

export function serverBasePath(publicUrl: string): string {
  if (!publicUrl) return '';
  return normalizeBasePath(new URL(publicUrl).pathname);
}

export function serverPublicUrl(config: Pick<AppConfig, 'server'> | Pick<Settings, 'server'>): string {
  if (config.server.publicUrl) return trimTrailingSlash(config.server.publicUrl);
  const host = config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host;
  return `http://${host}:${config.server.port}`;
}

export function serverTokenUrl(config: Pick<AppConfig, 'server'> | Pick<Settings, 'server'>): string {
  return `${serverPublicUrl(config)}/?token=${encodeURIComponent(config.server.accessToken)}`;
}

export function listSettingFields(): SettingField[] {
  return [...SETTING_FIELDS];
}

export function getSettingValue(settings: Settings | AppConfig, key: string): unknown {
  const field = findSettingField(key);
  return getPath(settings as unknown as Record<string, unknown>, field.path);
}

export function setSettingValue(key: string, value: unknown): Settings {
  const field = findSettingField(key);
  if (field.readOnly) throw new Error(`Config key is read-only: ${key}`);
  const current = readSettings();
  const next = structuredClone(current) as unknown as Record<string, unknown>;
  setPath(next, field.path, parseSettingInput(field, value));
  const parsed = validateSettings(next);
  writeSettings(parsed);
  return parsed;
}

export function maskSettings<T>(settings: T): T {
  const next = structuredClone(settings) as unknown as Record<string, unknown>;
  for (const field of SETTING_FIELDS) {
    if (!field.secret) continue;
    const value = getPath(next, field.path);
    if (typeof value === 'string' && value) {
      setPath(next, field.path, maskSecret(value));
    }
  }
  maskClusterPeerSecrets(next);
  return next as T;
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function createDefaultSettings(home = defaultConfigHome()): Settings {
  return validateSettings({
    server: {
      host: '0.0.0.0',
      port: 3030,
      publicUrl: '',
      accessToken: randomBytes(24).toString('hex'),
    },
    cluster: {
      name: hostname(),
      peers: [],
    },
    workspace: {
      roots: [process.cwd()],
    },
    agents: {
      default: 'codex',
      codex: {
        bin: 'codex',
        model: 'auto',
        reasoningEffort: 'default',
        permissionMode: 'default',
        search: true,
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
  setEnvPath(next, ['server', 'host'], process.env.CX_TG_HOST);
  setEnvPath(next, ['server', 'port'], process.env.CX_TG_PORT);
  setEnvPath(next, ['server', 'publicUrl'], process.env.CX_TG_PUBLIC_URL);
  setEnvPath(next, ['server', 'accessToken'], process.env.CX_TG_ACCESS_TOKEN);
  setEnvPath(next, ['storage', 'dbPath'], process.env.CX_TG_DB_PATH);
  setEnvPath(next, ['agents', 'codex', 'bin'], process.env.CODEX_BIN);
  setEnvPath(next, ['agents', 'codex', 'model'], process.env.CODEX_MODEL);
  setEnvPath(next, ['agents', 'codex', 'reasoningEffort'], process.env.CODEX_REASONING_EFFORT);
  setEnvPath(next, ['agents', 'codex', 'permissionMode'], process.env.CODEX_PERMISSION_MODE as CodexPermissionMode | undefined);
  setEnvPath(next, ['agents', 'codex', 'search'], boolEnv(process.env.CODEX_SEARCH));
  setEnvPath(next, ['controls', 'telegram', 'enabled'], boolEnv(process.env.TG_ENABLED));
  setEnvPath(next, ['controls', 'telegram', 'botToken'], process.env.TG_BOT_TOKEN);
  setEnvPath(next, ['controls', 'telegram', 'allowedUsers'], listEnv(process.env.TG_ALLOWED_USERS));
  setEnvPath(next, ['controls', 'telegram', 'allowedChats'], listEnv(process.env.TG_ALLOWED_CHATS));
  setEnvPath(next, ['log', 'level'], process.env.LOG_LEVEL);
  setEnvPath(next, ['log', 'file'], process.env.LOG_FILE);
  setEnvPath(next, ['log', 'console'], boolEnv(process.env.LOG_CONSOLE));
  setEnvPath(next, ['log', 'prompts'], boolEnv(process.env.LOG_PROMPTS));
  setEnvPath(next, ['approvals', 'autoApproveCommands'], listEnv(process.env.AUTO_APPROVE_COMMANDS));
  setEnvPath(next, ['approvals', 'autoApproveReadonly'], boolEnv(process.env.AUTO_APPROVE_READONLY));
  return next;
}

function setEnvPath(target: Record<string, unknown>, path: string[], value: unknown): void {
  if (value === undefined || value === '') return;
  setPath(target, path, value);
}

function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
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

function getPath(target: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = target;
  for (const part of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function parseSettingInput(field: SettingField, value: unknown): unknown {
  if (field.type === 'string') return typeof value === 'string' ? value : String(value);

  if (field.type === 'number') {
    const parsed = typeof value === 'number' ? value : Number(String(value));
    if (!Number.isFinite(parsed)) throw new Error(`Config key requires a number: ${field.key}`);
    return parsed;
  }

  if (field.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') throw new Error(`Config key requires a boolean: ${field.key}`);
    const normalized = value.toLowerCase();
    if (['true', 'yes', '1', 'on'].includes(normalized)) return true;
    if (['false', 'no', '0', 'off'].includes(normalized)) return false;
    throw new Error(`Config key requires a boolean: ${field.key}`);
  }

  if (field.type === 'string[]') {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
    if (typeof value !== 'string') throw new Error(`Config key requires a string list: ${field.key}`);
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed;
      throw new Error(`Config key requires a string list: ${field.key}`);
    }
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  if (field.type === 'enum') {
    const parsed = typeof value === 'string' ? value : String(value);
    if (!field.choices?.includes(parsed)) {
      throw new Error(`Config key ${field.key} must be one of: ${field.choices?.join(', ')}`);
    }
    return parsed;
  }

  if (field.type === 'json') {
    if (typeof value !== 'string') return value;
    return JSON.parse(value);
  }

  return value;
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

function validatePublicUrl(config: Settings): void {
  if (!config.server.publicUrl) return;
  const url = new URL(config.server.publicUrl);
  if (url.search || url.hash) throw new Error('server.publicUrl must not include query or hash');
}

function validateCluster(config: Settings): void {
  const ids = new Set<string>();
  for (const peer of config.cluster.peers) {
    if (peer.id === 'local') throw new Error('cluster.peers id "local" is reserved');
    if (ids.has(peer.id)) throw new Error(`Duplicate cluster peer id: ${peer.id}`);
    ids.add(peer.id);
  }
}

function maskClusterPeerSecrets(settings: Record<string, unknown>): void {
  const cluster = settings.cluster;
  if (!cluster || typeof cluster !== 'object' || Array.isArray(cluster)) return;
  const peers = (cluster as Record<string, unknown>).peers;
  if (!Array.isArray(peers)) return;
  for (const peer of peers) {
    if (!peer || typeof peer !== 'object' || Array.isArray(peer)) continue;
    const token = (peer as Record<string, unknown>).accessToken;
    if (typeof token === 'string' && token) {
      (peer as Record<string, unknown>).accessToken = maskSecret(token);
    }
  }
}

function normalizeBasePath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === '' || normalized === '/' ? '' : normalized;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
