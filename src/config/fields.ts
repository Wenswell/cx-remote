export type SettingFieldType = 'string' | 'number' | 'boolean' | 'string[]' | 'enum';

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
  { key: 'server.host', path: ['server', 'host'], type: 'string', env: 'CX_TG_HOST', restartRequired: true, description: 'Hub listen host' },
  { key: 'server.port', path: ['server', 'port'], type: 'number', env: 'CX_TG_PORT', restartRequired: true, description: 'Hub listen port' },
  { key: 'server.publicUrl', path: ['server', 'publicUrl'], type: 'string', env: 'CX_TG_PUBLIC_URL', description: 'External Web URL' },
  { key: 'server.accessToken', path: ['server', 'accessToken'], type: 'string', env: 'CX_TG_ACCESS_TOKEN', secret: true, restartRequired: true, description: 'API and Web bearer token' },
  { key: 'workspace.roots', path: ['workspace', 'roots'], type: 'string[]', restartRequired: true, description: 'Allowed workspace roots' },
  { key: 'codex.bin', path: ['agents', 'codex', 'bin'], type: 'string', env: 'CODEX_BIN', restartRequired: true, description: 'Codex executable' },
  { key: 'codex.model', path: ['agents', 'codex', 'model'], type: 'string', env: 'CODEX_MODEL', description: 'Codex model override' },
  { key: 'codex.reasoningEffort', path: ['agents', 'codex', 'reasoningEffort'], type: 'string', env: 'CODEX_REASONING_EFFORT', description: 'Codex reasoning effort' },
  { key: 'codex.approvalPolicy', path: ['agents', 'codex', 'approvalPolicy'], type: 'enum', env: 'CODEX_APPROVAL_POLICY', choices: ['untrusted', 'on-failure', 'on-request', 'never'], description: 'Codex approval policy' },
  { key: 'codex.sandbox', path: ['agents', 'codex', 'sandbox'], type: 'enum', env: 'CODEX_SANDBOX', choices: ['read-only', 'workspace-write', 'danger-full-access'], description: 'Codex sandbox mode' },
  { key: 'codex.search', path: ['agents', 'codex', 'search'], type: 'boolean', env: 'CODEX_SEARCH', description: 'Codex web search flag' },
  { key: 'codex.bypassApprovalsAndSandbox', path: ['agents', 'codex', 'bypassApprovalsAndSandbox'], type: 'boolean', env: 'CODEX_BYPASS_APPROVALS_AND_SANDBOX', description: 'Codex dangerous approval and sandbox bypass flag' },
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
  { key: 'storage.dbPath', path: ['storage', 'dbPath'], type: 'string', env: 'CX_TG_DB_PATH', restartRequired: true, description: 'SQLite database path' },
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
