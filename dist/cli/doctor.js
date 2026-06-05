import { accessSync, constants, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadConfig, maskSecret } from '../config/config.js';
export async function runDoctor(client) {
    let config;
    let source;
    try {
        const loaded = loadConfig();
        config = loaded.config;
        source = loaded.source;
    }
    catch (error) {
        printSection('Config', [{
                name: 'settings',
                status: 'fail',
                detail: error instanceof Error ? error.message : String(error),
            }]);
        process.exitCode = 1;
        return;
    }
    const sections = [
        ['Config', configChecks(config, source)],
        ['Dependencies', dependencyChecks(config)],
        ['Workspace', workspaceChecks(config)],
        ['Storage', storageChecks(config)],
        ['Telegram', telegramChecks(config)],
        ['Notifications', notificationChecks(config)],
    ];
    for (const [title, checks] of sections)
        printSection(title, checks);
    printSection('Hub', await hubChecks(client));
    if (sections.some(([, checks]) => checks.some((check) => check.status === 'fail'))) {
        process.exitCode = 1;
    }
}
function configChecks(config, source) {
    return [
        { name: 'settings', status: 'ok', detail: `${config.settingsPath} (${source})` },
        { name: 'listen', status: 'ok', detail: `${config.server.host}:${config.server.port}` },
        { name: 'accessToken', status: config.server.accessToken ? 'ok' : 'fail', detail: config.server.accessToken ? maskSecret(config.server.accessToken) : 'missing' },
        { name: 'logLevel', status: 'ok', detail: config.log.level },
    ];
}
function dependencyChecks(config) {
    return [
        { name: 'node', status: 'ok', detail: process.version },
        commandCheck('codex', config.agents.codex.bin, ['--version']),
    ];
}
function workspaceChecks(config) {
    return config.workspace.roots.map((root) => accessCheck(root, constants.R_OK | constants.W_OK | constants.X_OK));
}
function storageChecks(config) {
    const dir = dirname(config.storage.dbPath);
    return [
        accessCheck(dir, constants.R_OK | constants.W_OK | constants.X_OK, 'dbDir'),
        existsSync(config.storage.dbPath)
            ? { name: 'database', status: 'ok', detail: config.storage.dbPath }
            : { name: 'database', status: 'warn', detail: `${config.storage.dbPath} will be created on start` },
    ];
}
function telegramChecks(config) {
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
function notificationChecks(config) {
    const webhook = config.notifications.feishu.webhook;
    return [
        { name: 'feishuWebhook', status: webhook ? 'ok' : 'warn', detail: webhook ? maskSecret(webhook) : 'missing' },
    ];
}
async function hubChecks(client) {
    if (!client)
        return [{ name: 'http', status: 'warn', detail: 'not checked' }];
    const checks = [];
    for (const path of ['/api/health', '/api/status']) {
        try {
            await client.get(path);
            checks.push({ name: path, status: 'ok', detail: 'reachable' });
        }
        catch (error) {
            checks.push({ name: path, status: 'warn', detail: error instanceof Error ? error.message : String(error) });
        }
    }
    return checks;
}
function accessCheck(path, mode, name = path) {
    try {
        accessSync(path, mode);
        return { name, status: 'ok', detail: path };
    }
    catch (error) {
        return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error) };
    }
}
function commandCheck(name, cmd, args) {
    const result = spawnSync(cmd, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        return { name, status: 'fail', detail: result.stderr.trim() || result.stdout.trim() || `${cmd} failed` };
    }
    return { name, status: 'ok', detail: result.stdout.trim() || result.stderr.trim() };
}
function printSection(title, checks) {
    console.log(`${title}:`);
    for (const check of checks) {
        console.log(`  ${check.status}\t${check.name}\t${check.detail}`);
    }
}
