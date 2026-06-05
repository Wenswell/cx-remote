import { accessSync, constants, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadConfig, maskSecret, type AppConfig } from '../config/config.js';

interface HubProbe {
  get(path: string): Promise<unknown>;
}

type CheckStatus = 'ok' | 'warn' | 'fail';

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

export async function runDoctor(client?: HubProbe): Promise<void> {
  let config: AppConfig;
  let source: string;
  try {
    const loaded = loadConfig();
    config = loaded.config;
    source = loaded.source;
  } catch (error) {
    printSection('Config', [{
      name: 'settings',
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    }]);
    process.exitCode = 1;
    return;
  }

  const sections: Array<[string, Check[]]> = [
    ['Config', configChecks(config, source)],
    ['Dependencies', dependencyChecks(config)],
    ['Workspace', workspaceChecks(config)],
    ['Storage', storageChecks(config)],
    ['Telegram', telegramChecks(config)],
    ['Notifications', notificationChecks(config)],
  ];

  for (const [title, checks] of sections) printSection(title, checks);
  printSection('Hub', await hubChecks(client));

  if (sections.some(([, checks]) => checks.some((check) => check.status === 'fail'))) {
    process.exitCode = 1;
  }
}

function configChecks(config: AppConfig, source: string): Check[] {
  return [
    { name: 'settings', status: 'ok', detail: `${config.settingsPath} (${source})` },
    { name: 'listen', status: 'ok', detail: `${config.server.host}:${config.server.port}` },
    { name: 'accessToken', status: config.server.accessToken ? 'ok' : 'fail', detail: config.server.accessToken ? maskSecret(config.server.accessToken) : 'missing' },
    { name: 'logLevel', status: 'ok', detail: config.log.level },
  ];
}

function dependencyChecks(config: AppConfig): Check[] {
  return [
    { name: 'node', status: 'ok', detail: process.version },
    commandCheck('codex', config.agents.codex.bin, ['--version']),
  ];
}

function workspaceChecks(config: AppConfig): Check[] {
  return config.workspace.roots.map((root) => accessCheck(root, constants.R_OK | constants.W_OK | constants.X_OK));
}

function storageChecks(config: AppConfig): Check[] {
  const dir = dirname(config.storage.dbPath);
  return [
    accessCheck(dir, constants.R_OK | constants.W_OK | constants.X_OK, 'dbDir'),
    existsSync(config.storage.dbPath)
      ? { name: 'database', status: 'ok', detail: config.storage.dbPath }
      : { name: 'database', status: 'warn', detail: `${config.storage.dbPath} will be created on start` },
  ];
}

function telegramChecks(config: AppConfig): Check[] {
  if (!config.controls.telegram.enabled) {
    return [{ name: 'enabled', status: 'ok', detail: 'false' }];
  }
  return [
    { name: 'enabled', status: 'ok', detail: 'true' },
    { name: 'botToken', status: config.controls.telegram.botToken ? 'ok' : 'fail', detail: config.controls.telegram.botToken ? 'set' : 'missing' },
    { name: 'allowedUsers', status: 'ok', detail: String(config.controls.telegram.allowedUsers.length) },
    { name: 'allowedChats', status: 'ok', detail: String(config.controls.telegram.allowedChats.length) },
    { name: 'requireMention', status: 'ok', detail: String(config.controls.telegram.requireMention) },
  ];
}

function notificationChecks(config: AppConfig): Check[] {
  const webhook = config.notifications.feishu.webhook;
  return [
    { name: 'feishuWebhook', status: webhook ? 'ok' : 'warn', detail: webhook ? maskSecret(webhook) : 'missing' },
  ];
}

async function hubChecks(client: HubProbe | undefined): Promise<Check[]> {
  if (!client) return [{ name: 'http', status: 'warn', detail: 'not checked' }];
  const checks: Check[] = [];
  for (const path of ['/api/health', '/api/status']) {
    try {
      await client.get(path);
      checks.push({ name: path, status: 'ok', detail: 'reachable' });
    } catch (error) {
      checks.push({ name: path, status: 'warn', detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return checks;
}

function accessCheck(path: string, mode: number, name = path): Check {
  try {
    accessSync(path, mode);
    return { name, status: 'ok', detail: path };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error) };
  }
}

function commandCheck(name: string, cmd: string, args: string[]): Check {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    return { name, status: 'fail', detail: result.stderr.trim() || result.stdout.trim() || `${cmd} failed` };
  }
  return { name, status: 'ok', detail: result.stdout.trim() || result.stderr.trim() };
}

function printSection(title: string, checks: Check[]): void {
  console.log(`${title}:`);
  for (const check of checks) {
    console.log(`  ${check.status}\t${check.name}\t${check.detail}`);
  }
}
