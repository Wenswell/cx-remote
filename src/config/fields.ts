import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS } from '../domain/types.js';

export type SettingFieldType = 'string' | 'number' | 'boolean' | 'string[]' | 'enum' | 'json';

export interface SettingField {
  key: string;
  path: string[];
  type: SettingFieldType;
  description: string;
  env?: string;
  choices?: string[];
  secret?: boolean;
  restartRequired?: boolean;
  readOnly?: boolean;
}

export const SETTING_FIELDS: SettingField[] = [
  { key: 'server.host', path: ['server', 'host'], type: 'string', env: 'CX_REMOTE_HOST', restartRequired: true, description: 'Hub listen host' },
  { key: 'server.port', path: ['server', 'port'], type: 'number', env: 'CX_REMOTE_PORT', restartRequired: true, description: 'Hub listen port' },
  { key: 'server.publicUrl', path: ['server', 'publicUrl'], type: 'string', env: 'CX_REMOTE_PUBLIC_URL', description: 'External Web URL; path becomes the Hub mount path' },
  { key: 'server.accessToken', path: ['server', 'accessToken'], type: 'string', env: 'CX_REMOTE_ACCESS_TOKEN', secret: true, restartRequired: true, description: 'API and Web bearer token' },
  { key: 'cluster.name', path: ['cluster', 'name'], type: 'string', restartRequired: true, description: 'Display name for this Hub node' },
  { key: 'cluster.peers', path: ['cluster', 'peers'], type: 'json', secret: true, restartRequired: true, description: 'Remote Hub peer definitions' },
  { key: 'workspace.roots', path: ['workspace', 'roots'], type: 'string[]', restartRequired: true, description: 'Allowed workspace roots' },
  { key: 'codex.bin', path: ['agents', 'codex', 'bin'], type: 'string', env: 'CODEX_BIN', restartRequired: true, description: 'Codex executable' },
  { key: 'codex.model', path: ['agents', 'codex', 'model'], type: 'enum', env: 'CODEX_MODEL', choices: ['auto', ...CODEX_MODEL_OPTIONS], description: 'Codex model' },
  { key: 'codex.reasoningEffort', path: ['agents', 'codex', 'reasoningEffort'], type: 'enum', env: 'CODEX_REASONING_EFFORT', choices: ['default', ...CODEX_REASONING_EFFORT_OPTIONS], description: 'Codex reasoning effort' },
  { key: 'codex.permissionMode', path: ['agents', 'codex', 'permissionMode'], type: 'enum', env: 'CODEX_PERMISSION_MODE', choices: ['default', 'read-only', 'safe-yolo', 'yolo'], description: 'Codex permission mode' },
  { key: 'codex.search', path: ['agents', 'codex', 'search'], type: 'boolean', env: 'CODEX_SEARCH', description: 'Codex web search flag' },
  { key: 'web.enabled', path: ['controls', 'web', 'enabled'], type: 'boolean', readOnly: true, description: 'Web control availability' },
  { key: 'cli.enabled', path: ['controls', 'cli', 'enabled'], type: 'boolean', readOnly: true, description: 'CLI control availability' },
  { key: 'telegram.enabled', path: ['controls', 'telegram', 'enabled'], type: 'boolean', env: 'TG_ENABLED', restartRequired: true, description: 'Telegram control availability' },
  { key: 'telegram.botToken', path: ['controls', 'telegram', 'botToken'], type: 'string', env: 'TG_BOT_TOKEN', secret: true, restartRequired: true, description: 'Telegram bot token' },
  { key: 'telegram.allowedUsers', path: ['controls', 'telegram', 'allowedUsers'], type: 'string[]', env: 'TG_ALLOWED_USERS', restartRequired: true, description: 'Telegram user allowlist' },
  { key: 'telegram.allowedChats', path: ['controls', 'telegram', 'allowedChats'], type: 'string[]', env: 'TG_ALLOWED_CHATS', restartRequired: true, description: 'Telegram chat allowlist' },
  { key: 'telegram.requireMention', path: ['controls', 'telegram', 'requireMention'], type: 'boolean', restartRequired: true, description: 'Require bot mention in groups' },
  { key: 'approvals.autoApproveCommands', path: ['approvals', 'autoApproveCommands'], type: 'string[]', env: 'AUTO_APPROVE_COMMANDS', description: 'Command prefixes approved automatically' },
  { key: 'approvals.autoApproveReadonly', path: ['approvals', 'autoApproveReadonly'], type: 'boolean', env: 'AUTO_APPROVE_READONLY', description: 'Automatically approve read-only commands' },
  { key: 'approvals.timeoutMs', path: ['approvals', 'timeoutMs'], type: 'number', description: 'Approval timeout in milliseconds' },
  { key: 'storage.dbPath', path: ['storage', 'dbPath'], type: 'string', env: 'CX_REMOTE_DB_PATH', restartRequired: true, description: 'SQLite database path' },
  { key: 'log.level', path: ['log', 'level'], type: 'enum', env: 'LOG_LEVEL', choices: ['debug', 'info', 'warn', 'error'], description: 'Log level' },
  { key: 'log.file', path: ['log', 'file'], type: 'string', env: 'LOG_FILE', restartRequired: true, description: 'Log file path' },
  { key: 'log.console', path: ['log', 'console'], type: 'boolean', env: 'LOG_CONSOLE', restartRequired: true, description: 'Console logging' },
  { key: 'log.prompts', path: ['log', 'prompts'], type: 'boolean', env: 'LOG_PROMPTS', description: 'Prompt logging' },
];

export function findSettingField(key: string): SettingField {
  const field = SETTING_FIELDS.find((item) => item.key === key);
  if (!field) throw new Error(`Unsupported config key: ${key}`);
  return field;
}
