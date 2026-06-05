import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS } from '../domain/types.js';
import { SETTING_FIELDS, findSettingField } from './fields.js';
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
        roots: z.array(z.string().min(1)),
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
    notifications: z.object({
        feishu: z.object({
            webhook: z.string().default(''),
        }).default({ webhook: '' }),
    }).default({ feishu: { webhook: '' } }),
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
        file: z.string().default('logs/cx-remote.log'),
        console: z.boolean().default(true),
        prompts: z.boolean().default(false),
    }),
});
const DEFAULT_HOME = join(homedir(), '.cx-remote');
export function defaultConfigHome() {
    return expandHome(process.env.CX_REMOTE_HOME || DEFAULT_HOME);
}
export function defaultSettingsPath(home = defaultConfigHome()) {
    return join(home, 'settings.json');
}
export function getSettingsPath() {
    return expandHome(process.env.CX_REMOTE_SETTINGS || defaultSettingsPath());
}
export function loadConfig() {
    const home = defaultConfigHome();
    const settingsPath = expandHome(process.env.CX_REMOTE_SETTINGS || defaultSettingsPath(home));
    mkdirSync(dirname(settingsPath), { recursive: true });
    let raw;
    let source = 'file';
    if (existsSync(settingsPath)) {
        raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
    }
    else {
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
export function readSettings() {
    const settingsPath = getSettingsPath();
    if (!existsSync(settingsPath)) {
        return createDefaultSettings();
    }
    const raw = JSON.parse(readFileSync(settingsPath, 'utf8'));
    return validateSettings(raw);
}
export function writeSettings(settings, settingsPath = getSettingsPath()) {
    const parsed = validateSettings(settings);
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
}
export function patchSettings(patch) {
    const current = readSettings();
    const next = {
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
        notifications: {
            ...current.notifications,
            ...patch.notifications,
            feishu: { ...current.notifications.feishu, ...patch.notifications?.feishu },
        },
        approvals: { ...current.approvals, ...patch.approvals },
        storage: { ...current.storage, ...patch.storage },
        log: { ...current.log, ...patch.log },
    };
    const parsed = validateSettings(next);
    writeSettings(parsed);
    return parsed;
}
export function validateSettings(input) {
    const settings = settingsSchema.parse(input);
    validatePublicUrl(settings);
    validateTelegram(settings);
    validateNotifications(settings);
    validateCluster(settings);
    return settings;
}
export function serverBasePath(publicUrl) {
    if (!publicUrl)
        return '';
    return normalizeBasePath(new URL(publicUrl).pathname);
}
export function serverPublicUrl(config) {
    if (config.server.publicUrl)
        return trimTrailingSlash(config.server.publicUrl);
    const host = config.server.host === '0.0.0.0' ? '127.0.0.1' : config.server.host;
    return `http://${host}:${config.server.port}`;
}
export function serverTokenUrl(config) {
    return `${serverPublicUrl(config)}/?token=${encodeURIComponent(config.server.accessToken)}`;
}
export function listSettingFields() {
    return [...SETTING_FIELDS];
}
export function getSettingValue(settings, key) {
    const field = findSettingField(key);
    return getPath(settings, field.path);
}
export function setSettingValue(key, value) {
    const field = findSettingField(key);
    if (field.readOnly)
        throw new Error(`Config key is read-only: ${key}`);
    const current = readSettings();
    const next = structuredClone(current);
    setPath(next, field.path, parseSettingInput(field, value));
    const parsed = validateSettings(next);
    writeSettings(parsed);
    return parsed;
}
export function maskSettings(settings) {
    const next = structuredClone(settings);
    for (const field of SETTING_FIELDS) {
        if (!field.secret)
            continue;
        const value = getPath(next, field.path);
        if (typeof value === 'string' && value) {
            setPath(next, field.path, maskSecret(value));
        }
    }
    maskClusterPeerSecrets(next);
    return next;
}
export function maskSecret(value) {
    if (!value)
        return '';
    if (value.length <= 8)
        return 'set';
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
export function createDefaultSettings(home = defaultConfigHome()) {
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
        notifications: {
            feishu: {
                webhook: '',
            },
        },
        approvals: {
            autoApproveCommands: [],
            autoApproveReadonly: false,
            timeoutMs: 5 * 60 * 1000,
        },
        storage: {
            dbPath: join(home, 'cx-remote.db'),
        },
        log: {
            level: 'info',
            file: 'logs/cx-remote.log',
            console: true,
            prompts: false,
        },
    });
}
export function expandHome(input) {
    if (input === '~')
        return homedir();
    if (input.startsWith('~/'))
        return join(homedir(), input.slice(2));
    return input;
}
export function resolveWorkspacePath(config, input) {
    const raw = expandHome(input);
    const roots = config.workspace.roots.map((root) => resolve(root));
    if (roots.length === 0)
        throw new Error('workspace.roots is empty on this Hub node');
    const candidate = resolve(raw);
    if (roots.some((root) => isPathInside(root, candidate)))
        return candidate;
    for (const root of roots) {
        const nested = resolve(root, raw);
        if (isPathInside(root, nested))
            return nested;
    }
    throw new Error(`Path must be inside one workspace root:\n${roots.join('\n')}`);
}
export function isPathInside(root, candidate) {
    const normalizedRoot = resolve(root);
    const normalizedCandidate = resolve(candidate);
    return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}
function applyEnv(raw) {
    if (!raw || typeof raw !== 'object')
        return raw;
    const next = structuredClone(raw);
    setEnvPath(next, ['server', 'host'], process.env.CX_REMOTE_HOST);
    setEnvPath(next, ['server', 'port'], process.env.CX_REMOTE_PORT);
    setEnvPath(next, ['server', 'publicUrl'], process.env.CX_REMOTE_PUBLIC_URL);
    setEnvPath(next, ['server', 'accessToken'], process.env.CX_REMOTE_ACCESS_TOKEN);
    setEnvPath(next, ['storage', 'dbPath'], process.env.CX_REMOTE_DB_PATH);
    setEnvPath(next, ['agents', 'codex', 'bin'], process.env.CODEX_BIN);
    setEnvPath(next, ['agents', 'codex', 'model'], process.env.CODEX_MODEL);
    setEnvPath(next, ['agents', 'codex', 'reasoningEffort'], process.env.CODEX_REASONING_EFFORT);
    setEnvPath(next, ['agents', 'codex', 'permissionMode'], process.env.CODEX_PERMISSION_MODE);
    setEnvPath(next, ['agents', 'codex', 'search'], boolEnv(process.env.CODEX_SEARCH));
    setEnvPath(next, ['notifications', 'feishu', 'webhook'], process.env.FEISHU_BOT_WEBHOOK);
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
function setEnvPath(target, path, value) {
    if (value === undefined || value === '')
        return;
    setPath(target, path, value);
}
function setPath(target, path, value) {
    let current = target;
    for (const part of path.slice(0, -1)) {
        const existing = current[part];
        if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
            current[part] = {};
        }
        current = current[part];
    }
    current[path[path.length - 1]] = value;
}
function getPath(target, path) {
    let current = target;
    for (const part of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current))
            return undefined;
        current = current[part];
    }
    return current;
}
function parseSettingInput(field, value) {
    if (field.type === 'string')
        return typeof value === 'string' ? value : String(value);
    if (field.type === 'number') {
        const parsed = typeof value === 'number' ? value : Number(String(value));
        if (!Number.isFinite(parsed))
            throw new Error(`Config key requires a number: ${field.key}`);
        return parsed;
    }
    if (field.type === 'boolean') {
        if (typeof value === 'boolean')
            return value;
        if (typeof value !== 'string')
            throw new Error(`Config key requires a boolean: ${field.key}`);
        const normalized = value.toLowerCase();
        if (['true', 'yes', '1', 'on'].includes(normalized))
            return true;
        if (['false', 'no', '0', 'off'].includes(normalized))
            return false;
        throw new Error(`Config key requires a boolean: ${field.key}`);
    }
    if (field.type === 'string[]') {
        if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
            return value;
        if (typeof value !== 'string')
            throw new Error(`Config key requires a string list: ${field.key}`);
        const trimmed = value.trim();
        if (!trimmed)
            return [];
        if (trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string'))
                return parsed;
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
        if (typeof value !== 'string')
            return value;
        return JSON.parse(value);
    }
    return value;
}
function boolEnv(value) {
    if (value === undefined || value === '')
        return undefined;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
function listEnv(value) {
    if (value === undefined)
        return undefined;
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}
function validateTelegram(config) {
    if (config.controls.telegram.enabled && !config.controls.telegram.botToken) {
        throw new Error('controls.telegram.botToken is required when Telegram is enabled');
    }
}
function validateNotifications(config) {
    const webhook = config.notifications.feishu.webhook;
    if (!webhook)
        return;
    const url = new URL(webhook);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('notifications.feishu.webhook must be an http or https URL');
    }
}
function validatePublicUrl(config) {
    if (!config.server.publicUrl)
        return;
    const url = new URL(config.server.publicUrl);
    if (url.search || url.hash)
        throw new Error('server.publicUrl must not include query or hash');
}
function validateCluster(config) {
    const ids = new Set();
    for (const peer of config.cluster.peers) {
        if (peer.id === 'local')
            throw new Error('cluster.peers id "local" is reserved');
        if (ids.has(peer.id))
            throw new Error(`Duplicate cluster peer id: ${peer.id}`);
        ids.add(peer.id);
    }
}
function maskClusterPeerSecrets(settings) {
    const cluster = settings.cluster;
    if (!cluster || typeof cluster !== 'object' || Array.isArray(cluster))
        return;
    const peers = cluster.peers;
    if (!Array.isArray(peers))
        return;
    for (const peer of peers) {
        if (!peer || typeof peer !== 'object' || Array.isArray(peer))
            continue;
        const token = peer.accessToken;
        if (typeof token === 'string' && token) {
            peer.accessToken = maskSecret(token);
        }
    }
}
function normalizeBasePath(pathname) {
    const normalized = pathname.replace(/\/+$/, '');
    return normalized === '' || normalized === '/' ? '' : normalized;
}
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
