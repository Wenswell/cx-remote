import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { defaultConfigHome, expandHome, getSettingsPath, maskSecret, readSettings, serverPublicUrl, writeSettings } from '../config/config.js';
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS } from '../domain/types.js';
const permissionModeChoices = ['default', 'read-only', 'safe-yolo', 'yolo'];
const logLevelChoices = ['debug', 'info', 'warn', 'error'];
export async function runSetup() {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error('cx-remote setup requires an interactive terminal; use cx-remote config set for scripts');
    }
    const rl = createInterface({ input, output });
    try {
        const current = readSettings();
        console.log('CX Remote setup');
        console.log(`Settings: ${getSettingsPath()}`);
        const home = defaultConfigHome();
        const workspaceRoots = (await ask(rl, 'Workspace roots', current.workspace.roots.join(','))).split(',').map((item) => item.trim()).filter(Boolean);
        const host = await ask(rl, 'Listen host', current.server.host);
        const port = await askInteger(rl, 'Listen port', current.server.port, (value) => value >= 1 && value <= 65535, 'Listen port must be an integer from 1 to 65535');
        const publicUrl = await askUrl(rl, 'Public URL', current.server.publicUrl);
        const clusterName = await ask(rl, 'Node name', current.cluster.name);
        const telegramEnabled = await yesNo(rl, 'Enable Telegram', current.controls.telegram.enabled);
        const telegramBotToken = telegramEnabled ? await askSecret(rl, 'Telegram bot token', current.controls.telegram.botToken) : current.controls.telegram.botToken;
        const telegramAllowedUsers = telegramEnabled ? splitList(await ask(rl, 'Telegram allowed users', current.controls.telegram.allowedUsers.join(','))) : current.controls.telegram.allowedUsers;
        const telegramAllowedChats = telegramEnabled ? splitList(await ask(rl, 'Telegram allowed chats', current.controls.telegram.allowedChats.join(','))) : current.controls.telegram.allowedChats;
        const requireMention = telegramEnabled ? await yesNo(rl, 'Require mention in groups', current.controls.telegram.requireMention) : current.controls.telegram.requireMention;
        const feishuWebhook = await askSecret(rl, 'Feishu webhook', current.notifications.feishu.webhook);
        console.log('');
        console.log('Session defaults (new Hub sessions)');
        const codexBin = await ask(rl, 'Session default Codex bin', current.agents.codex.bin || 'codex');
        const codexModel = await askChoice(rl, 'Session default Codex model', ['auto', ...CODEX_MODEL_OPTIONS], current.agents.codex.model);
        const reasoningEffort = await askChoice(rl, 'Session default Codex reasoning effort', ['default', ...CODEX_REASONING_EFFORT_OPTIONS], current.agents.codex.reasoningEffort);
        const permissionMode = await askChoice(rl, 'Session default permission mode', permissionModeChoices, current.agents.codex.permissionMode);
        const search = await yesNo(rl, 'Session default Codex search', current.agents.codex.search);
        const autoApproveReadonly = await yesNo(rl, 'Auto approve read-only commands', current.approvals.autoApproveReadonly);
        const autoApproveCommands = splitList(await ask(rl, 'Auto approve commands', current.approvals.autoApproveCommands.join(',')));
        const timeoutMs = await askInteger(rl, 'Approval timeout ms', current.approvals.timeoutMs, (value) => value >= 10_000, 'Approval timeout ms must be an integer of at least 10000');
        const logLevel = await askChoice(rl, 'Log level', logLevelChoices, current.log.level);
        const logFile = await ask(rl, 'Log file', current.log.file);
        const next = {
            ...current,
            server: {
                ...current.server,
                host,
                port,
                publicUrl,
                accessToken: current.server.accessToken || randomBytes(24).toString('hex'),
            },
            cluster: {
                ...current.cluster,
                name: clusterName,
            },
            workspace: {
                roots: workspaceRoots.map((root) => expandHome(root)),
            },
            agents: {
                ...current.agents,
                codex: {
                    ...current.agents.codex,
                    bin: codexBin,
                    model: codexModel,
                    reasoningEffort,
                    permissionMode: permissionMode,
                    search,
                },
            },
            controls: {
                ...current.controls,
                telegram: {
                    ...current.controls.telegram,
                    enabled: telegramEnabled,
                    botToken: telegramBotToken,
                    allowedUsers: telegramAllowedUsers,
                    allowedChats: telegramAllowedChats,
                    requireMention,
                },
            },
            notifications: {
                ...current.notifications,
                feishu: {
                    ...current.notifications.feishu,
                    webhook: feishuWebhook,
                },
            },
            approvals: {
                ...current.approvals,
                autoApproveReadonly,
                autoApproveCommands,
                timeoutMs,
            },
            log: {
                ...current.log,
                level: logLevel,
                file: logFile,
            },
            storage: {
                ...current.storage,
                dbPath: current.storage.dbPath || join(home, 'cx-remote.db'),
            },
        };
        writeSettings(next);
        console.log(`Saved ${getSettingsPath()}`);
        console.log(`Web URL: ${serverPublicUrl(next)}`);
        console.log(`Web token: ${maskSecret(next.server.accessToken)}`);
        console.log(`Workspace roots: ${next.workspace.roots.join(', ')}`);
    }
    finally {
        rl.close();
    }
}
async function ask(rl, label, current = '') {
    const suffix = current ? ` [${current}]` : '';
    const answer = await rl.question(`${label}${suffix}: `);
    return answer.trim() || current;
}
async function askSecret(rl, label, current = '') {
    const suffix = current ? ` [${maskSecret(current)}; blank keeps current]` : '';
    const answer = await rl.question(`${label}${suffix}: `);
    return answer.trim() || current;
}
async function askChoice(rl, label, choices, current) {
    while (true) {
        const value = await ask(rl, `${label} (${choices.join(', ')})`, current);
        if (choices.includes(value))
            return value;
        console.log(`Choose one of: ${choices.join(', ')}`);
    }
}
async function yesNo(rl, label, current) {
    while (true) {
        const answer = (await ask(rl, `${label} (y/n)`, current ? 'y' : 'n')).toLowerCase();
        if (['y', 'yes', '1', 'true'].includes(answer))
            return true;
        if (['n', 'no', '0', 'false'].includes(answer))
            return false;
        console.log('Enter y or n.');
    }
}
async function askInteger(rl, label, current, validate, message) {
    while (true) {
        const raw = await ask(rl, label, String(current));
        const parsed = Number(raw);
        if (Number.isInteger(parsed) && validate(parsed))
            return parsed;
        console.log(message);
    }
}
async function askUrl(rl, label, current) {
    while (true) {
        const raw = await ask(rl, label, current);
        if (!raw)
            return '';
        try {
            const url = new URL(raw);
            if (url.search || url.hash)
                throw new Error('query and hash are not allowed');
            if (url.protocol !== 'http:' && url.protocol !== 'https:')
                throw new Error('must use http or https');
            return raw;
        }
        catch {
            console.log('Enter a valid absolute URL.');
        }
    }
}
function splitList(value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}
