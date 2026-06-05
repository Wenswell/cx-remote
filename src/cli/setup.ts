import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { defaultConfigHome, expandHome, getSettingsPath, maskSecret, readSettings, serverPublicUrl, writeSettings, type Settings } from '../config/config.js';
import { CODEX_MODEL_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS } from '../domain/types.js';

export async function runSetup(): Promise<void> {
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
    const port = Number(await ask(rl, 'Listen port', String(current.server.port)));
    const publicUrl = await ask(rl, 'Public URL', current.server.publicUrl);
    const clusterName = await ask(rl, 'Node name', current.cluster.name);
    const telegramEnabled = await yesNo(rl, 'Enable Telegram', current.controls.telegram.enabled);
    const telegramBotToken = telegramEnabled ? await askSecret(rl, 'Telegram bot token', current.controls.telegram.botToken) : current.controls.telegram.botToken;
    const telegramAllowedUsers = telegramEnabled ? splitList(await ask(rl, 'Telegram allowed users', current.controls.telegram.allowedUsers.join(','))) : current.controls.telegram.allowedUsers;
    const telegramAllowedChats = telegramEnabled ? splitList(await ask(rl, 'Telegram allowed chats', current.controls.telegram.allowedChats.join(','))) : current.controls.telegram.allowedChats;
    const requireMention = telegramEnabled ? await yesNo(rl, 'Require mention in groups', current.controls.telegram.requireMention) : current.controls.telegram.requireMention;
    const feishuWebhook = await askSecret(rl, 'Feishu webhook', current.notifications.feishu.webhook);
    const codexBin = await ask(rl, 'Codex bin', current.agents.codex.bin || 'codex');
    const codexModel = await askChoice(rl, 'Codex model', ['auto', ...CODEX_MODEL_OPTIONS], current.agents.codex.model);
    const reasoningEffort = await askChoice(rl, 'Codex reasoning effort', ['default', ...CODEX_REASONING_EFFORT_OPTIONS], current.agents.codex.reasoningEffort);
    const permissionMode = await ask(rl, 'Permission mode', current.agents.codex.permissionMode);
    const search = await yesNo(rl, 'Enable Codex search', current.agents.codex.search);
    const autoApproveReadonly = await yesNo(rl, 'Auto approve read-only commands', current.approvals.autoApproveReadonly);
    const autoApproveCommands = splitList(await ask(rl, 'Auto approve commands', current.approvals.autoApproveCommands.join(',')));
    const timeoutMs = Number(await ask(rl, 'Approval timeout ms', String(current.approvals.timeoutMs)));
    const logLevel = await ask(rl, 'Log level', current.log.level);
    const logFile = await ask(rl, 'Log file', current.log.file);

    const next: Settings = {
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
          permissionMode: permissionMode as Settings['agents']['codex']['permissionMode'],
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
        level: logLevel as Settings['log']['level'],
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
  } finally {
    rl.close();
  }
}

async function ask(rl: ReturnType<typeof createInterface>, label: string, current = ''): Promise<string> {
  const suffix = current ? ` [${current}]` : '';
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || current;
}

async function askSecret(rl: ReturnType<typeof createInterface>, label: string, current = ''): Promise<string> {
  const suffix = current ? ` [${maskSecret(current)}; blank keeps current]` : '';
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || current;
}

async function askChoice<const TChoice extends string>(
  rl: ReturnType<typeof createInterface>,
  label: string,
  choices: readonly TChoice[],
  current: TChoice,
): Promise<TChoice> {
  const value = await ask(rl, `${label} (${choices.join(', ')})`, current);
  if (choices.includes(value as TChoice)) return value as TChoice;
  throw new Error(`${label} must be one of: ${choices.join(', ')}`);
}

async function yesNo(rl: ReturnType<typeof createInterface>, label: string, current: boolean): Promise<boolean> {
  const answer = (await ask(rl, `${label} (y/n)`, current ? 'y' : 'n')).toLowerCase();
  return ['y', 'yes', '1', 'true'].includes(answer);
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}
