import { Bot, InlineKeyboard } from 'grammy';
import { run, type RunnerHandle } from '@grammyjs/runner';
import type { Api, RawApi } from 'grammy';
import type { AppConfig } from '../config/config.js';
import { ControlHub } from '../runtime/control-hub.js';
import type { Approval, HubEvent, Message, Session } from '../domain/types.js';
import { escapeHtml } from '../utils.js';
import { logger } from '../logger.js';
import { formatControlClaimed, formatControlReleased, formatStopSent } from './control-actions.js';

const commands = [
  { command: 'start', description: 'Show CX TG help' },
  { command: 'status', description: 'Show bridge status' },
  { command: 'new', description: 'Create session: /new <path>' },
  { command: 'sessions', description: 'List sessions' },
  { command: 'use', description: 'Bind chat to a session' },
  { command: 'bind', description: 'Alias for /use' },
  { command: 'claim', description: 'Claim current session control' },
  { command: 'release', description: 'Release current session control' },
  { command: 'current', description: 'Show current bound session' },
  { command: 'approvals', description: 'List pending approvals' },
  { command: 'stop', description: 'Stop current session' },
  { command: 'help', description: 'Show commands' },
] as const;

type TelegramTarget = {
  chatId: string;
  threadId?: string;
};

export class TelegramControl {
  private bot: Bot | null = null;
  private runner: RunnerHandle | null = null;
  private unsubscribe: (() => void) | null = null;
  private username: string | undefined;

  constructor(
    private readonly hub: ControlHub,
    private readonly config: AppConfig,
  ) {}

  async start(): Promise<void> {
    if (!this.config.controls.telegram.enabled) return;
    this.bot = new Bot(this.config.controls.telegram.botToken);
    const me = await this.bot.api.getMe();
    this.username = me.username;
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text.trim();
      if (this.shouldIgnoreGroupMessage(text, this.username)) return;
      const cleanText = stripBotMention(text, this.username);
      const target: TelegramTarget = {
        chatId: String(ctx.chat.id),
        threadId: ctx.message.message_thread_id ? String(ctx.message.message_thread_id) : undefined,
      };
      const userId = String(ctx.from?.id ?? '');
      if (!this.isAllowed(userId, target.chatId)) {
        await ctx.reply(`Access denied. user=${userId} chat=${target.chatId}`);
        return;
      }
      await this.handleText(target, cleanText, userId);
    });

    this.bot.on('callback_query:data', async (ctx) => {
      await ctx.answerCallbackQuery().catch(() => {});
      const chatId = String(ctx.callbackQuery.message?.chat.id ?? '');
      const userId = String(ctx.callbackQuery.from.id);
      if (!this.isAllowed(userId, chatId)) return;
      await this.handleCallback(ctx.callbackQuery.data, 'telegram');
    });

    await this.bot.api.setMyCommands(commands);
    await this.bot.api.deleteWebhook();
    this.runner = run(this.bot, { runner: { silent: true } });
    void this.runner.task()?.catch((error) => {
      logger.error('telegram runner stopped', { error: sanitizeTelegramError(error instanceof Error ? error.message : String(error)) });
    });
    this.unsubscribe = this.hub.events.subscribe((event) => {
      void this.handleHubEvent(event).catch((error) => {
        logger.warn('telegram event delivery failed', { error: error instanceof Error ? error.message : String(error) });
      });
    });
    logger.info('telegram control started');
  }

  async stop(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.runner?.stop();
    this.runner = null;
    this.bot = null;
  }

  private async handleText(target: TelegramTarget, text: string, userId: string): Promise<void> {
    const key = bindingKey(target);
    const owner = telegramOwner(key, userId);
    if (text === '/start' || text === '/help') {
      await this.send(target, helpText(this.publicUrl()));
      return;
    }

    if (text === '/status') {
      await this.send(target, formatStatus(this.hub.stats(), this.hub.getBinding('telegram', key)?.sessionId));
      return;
    }

    if (text === '/sessions') {
      await this.send(target, formatSessions(this.hub.listSessions()));
      return;
    }

    if (text.startsWith('/use ') || text.startsWith('/bind ')) {
      const sessionId = text.replace(/^\/(use|bind)\s+/, '').trim();
      const session = this.hub.getSession(sessionId);
      this.hub.bindControl('telegram', key, session.id);
      await this.send(target, `Bound to session:\n${session.title}\n${session.id}`);
      return;
    }

    if (text === '/current') {
      const session = this.boundSession(key);
      await this.send(target, formatSession(session));
      return;
    }

    if (text === '/claim') {
      const session = this.boundSession(key);
      this.hub.claimControl(session.id, { controlType: 'telegram', ownerId: owner.id, label: owner.label });
      await this.send(target, formatControlClaimed(session.title));
      return;
    }

    if (text === '/release') {
      const session = this.boundSession(key);
      this.hub.releaseControl(session.id, owner.id);
      await this.send(target, formatControlReleased(session.title));
      return;
    }

    if (text === '/approvals') {
      const session = this.boundSession(key);
      await this.send(target, formatApprovals(this.hub.listApprovals({ sessionId: session.id, status: 'pending' })));
      return;
    }

    if (text.startsWith('/new ')) {
      const cwd = text.slice('/new '.length).trim();
      const session = this.hub.createSession({
        cwd,
        bind: { controlType: 'telegram', externalId: key },
      });
      await this.send(target, `Session created:\n${session.title}\n${session.cwd}\n${session.id}`);
      return;
    }

    if (text === '/stop') {
      const session = this.boundSession(key);
      await this.hub.interrupt(session.id);
      await this.send(target, formatStopSent());
      return;
    }

    if (text.startsWith('/')) {
      await this.send(target, helpText(this.publicUrl()));
      return;
    }

    const session = this.boundSession(key);
    await this.hub.sendMessage(session.id, text, 'telegram', { ownerId: owner.id, label: owner.label });
    await this.send(target, `Sent to ${session.title}.`);
    logger.info('telegram prompt sent', { sessionKey: session.id, userId });
  }

  private async handleCallback(data: string, source: 'telegram'): Promise<void> {
    const match = data.match(/^ap:([^:]+):(approved|approved_for_session|denied|abort|cancel|\d+)$/);
    if (!match) return;
    const [, approvalId, decision] = match;
    await this.hub.resolveApproval(approvalId!, decision!, source);
  }

  private async handleHubEvent(event: HubEvent): Promise<void> {
    if (!event.sessionId) return;
    const bindings = this.hub.listBindings('telegram').filter((binding) => binding.sessionId === event.sessionId);
    if (bindings.length === 0) return;

    if (event.type === 'message.created') {
      const message = event.payload.message as Message | undefined;
      if (!message || message.role === 'user') return;
      await Promise.all(bindings.map((binding) => this.send(parseBindingKey(binding.externalId), formatMessage(message))));
      return;
    }

    if (event.type === 'approval.created') {
      const approval = event.payload.approval as Approval | undefined;
      if (!approval) return;
      await Promise.all(bindings.map((binding) => this.sendApproval(parseBindingKey(binding.externalId), approval)));
    }
  }

  private boundSession(key: string): Session {
    const binding = this.hub.getBinding('telegram', key);
    if (!binding) throw new Error('No session bound. Use /new <path> or /use <session-id>.');
    return this.hub.getSession(binding.sessionId);
  }

  private isAllowed(userId: string, chatId: string): boolean {
    const users = this.config.controls.telegram.allowedUsers;
    const chats = this.config.controls.telegram.allowedChats;
    const userOk = users.length === 0 || users.includes(userId);
    const chatOk = chats.length === 0 || chats.includes(chatId);
    return userOk && chatOk;
  }

  private shouldIgnoreGroupMessage(text: string, username: string | undefined): boolean {
    if (!this.config.controls.telegram.requireMention) return false;
    if (!username) return false;
    if (text.startsWith('/')) return false;
    return !text.includes(`@${username}`);
  }

  private publicUrl(): string {
    const base = this.config.server.publicUrl || `http://${this.config.server.host}:${this.config.server.port}`;
    return `${base.replace(/\/$/, '')}/?token=${encodeURIComponent(this.config.server.accessToken)}`;
  }

  private async send(target: TelegramTarget, text: string): Promise<void> {
    const threadId = target.threadId ? Number(target.threadId) : undefined;
    for (const chunk of splitTelegramText(text)) {
      await this.api.sendMessage(target.chatId, renderTelegramHtml(chunk), {
        parse_mode: 'HTML',
        message_thread_id: threadId && threadId !== 1 ? threadId : undefined,
        link_preview_options: { is_disabled: true },
      });
    }
  }

  private async sendApproval(target: TelegramTarget, approval: Approval): Promise<void> {
    const threadId = target.threadId ? Number(target.threadId) : undefined;
    const keyboard = new InlineKeyboard();
    if (approval.type === 'choice') {
      const options = extractApprovalOptions(approval).slice(0, 6);
      options.forEach((option, index) => {
        keyboard.text(option.label, `ap:${approval.id}:${index}`);
        if (index % 2 === 1) keyboard.row();
      });
      keyboard.text('Cancel', `ap:${approval.id}:cancel`);
    } else {
      keyboard.text('Allow', `ap:${approval.id}:approved`)
        .text('Allow session', `ap:${approval.id}:approved_for_session`)
        .row()
        .text('Deny', `ap:${approval.id}:denied`);
    }

    await this.api.sendMessage(target.chatId, renderTelegramHtml(formatApproval(approval)), {
      parse_mode: 'HTML',
      message_thread_id: threadId && threadId !== 1 ? threadId : undefined,
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  private get api(): Api<RawApi> {
    if (!this.bot) throw new Error('Telegram control is not started');
    return this.bot.api;
  }
}

function bindingKey(target: TelegramTarget): string {
  return `${target.chatId}:${target.threadId || 'main'}`;
}

function parseBindingKey(key: string): TelegramTarget {
  const [chatId, threadId] = key.split(':');
  return { chatId: chatId!, threadId: threadId === 'main' ? undefined : threadId };
}

function stripBotMention(text: string, username: string | undefined): string {
  return username ? text.replace(new RegExp(`@${username}\\b`, 'gi'), '').trim() : text;
}

function telegramOwner(key: string, userId: string): { id: string; label: string } {
  return {
    id: `telegram:${key}:${userId}`,
    label: `Telegram ${userId}`,
  };
}

function helpText(webUrl: string): string {
  return [
    'CX TG commands',
    '/new <path> - create and bind a session',
    '/sessions - list sessions',
    '/use <session-id> - bind this chat/topic',
    '/bind <session-id> - bind this chat/topic',
    '/claim - claim control',
    '/release - release control',
    '/current - show current session',
    '/approvals - list pending approvals',
    '/status - show status',
    '/stop - stop current session',
    '/help - show help',
    '',
    `Web: ${webUrl}`,
  ].join('\n');
}

function formatSession(session: Session): string {
  return [
    session.title,
    session.id,
    session.cwd,
    session.status,
    `Thread: ${session.codexThreadId ?? '-'}`,
    `Turn: ${session.currentTurnId ?? '-'}`,
    `Control: ${session.controlLabel ?? 'shared'}`,
    `Lease: ${session.controlLeaseExpiresAt ? new Date(session.controlLeaseExpiresAt).toISOString() : '-'}`,
    `Error: ${session.lastError ?? '-'}`,
  ].join('\n');
}

function formatApprovals(approvals: Approval[]): string {
  if (approvals.length === 0) return 'No pending approvals.';
  return approvals.map((approval, index) => [
    `${index + 1}. ${approval.toolName}`,
    approval.id,
    JSON.stringify(approval.input, null, 2),
  ].join('\n')).join('\n\n');
}

function formatStatus(stats: ReturnType<ControlHub['stats']>, sessionId: string | undefined): string {
  return [
    'CX TG status',
    `Sessions: ${stats.sessions}`,
    `Messages: ${stats.messages}`,
    `Pending approvals: ${stats.pendingApprovals}`,
    `Active runtimes: ${stats.runtimes}`,
    `Bound session: ${sessionId ?? 'none'}`,
  ].join('\n');
}

function formatSessions(sessions: Session[]): string {
  if (sessions.length === 0) return 'No sessions. Use /new <path>.';
  return sessions.map((session, index) => [
    `${index + 1}. ${session.title}`,
    session.id,
    session.cwd,
    session.status,
  ].join('\n')).join('\n\n');
}

function formatMessage(message: Message): string {
  return [
    `[${message.role}]`,
    message.content,
  ].join('\n');
}

function formatApproval(approval: Approval): string {
  return [
    'Approval requested',
    `Tool: ${approval.toolName}`,
    '',
    JSON.stringify(approval.input, null, 2),
  ].join('\n');
}

function extractApprovalOptions(approval: Approval): Array<{ label: string }> {
  const input = approval.input as { options?: Array<{ label: string }> };
  return Array.isArray(input.options) ? input.options : [{ label: 'Continue' }];
}

function renderTelegramHtml(markdown: string): string {
  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];

  let html = markdown.replace(/```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_match, language: string | undefined, code: string) => {
    const label = language ? `${escapeHtml(language)}\n` : '';
    const token = `\u0000CODE_BLOCK_${codeBlocks.length}\u0000`;
    codeBlocks.push(`<pre><code>${label}${escapeHtml(code.trimEnd())}</code></pre>`);
    return token;
  });

  html = html.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const token = `\u0000INLINE_CODE_${inlineCodes.length}\u0000`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  html = escapeHtml(html);
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  html = html.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)"']+)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/\u0000CODE_BLOCK_(\d+)\u0000/g, (_match, index: string) => codeBlocks[Number(index)] ?? '');
  html = html.replace(/\u0000INLINE_CODE_(\d+)\u0000/g, (_match, index: string) => inlineCodes[Number(index)] ?? '');
  return html;
}

function splitTelegramText(text: string): string[] {
  const limit = 3500;
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const newline = rest.lastIndexOf('\n', limit);
    const index = newline > 500 ? newline : limit;
    chunks.push(rest.slice(0, index));
    rest = rest.slice(index).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function sanitizeTelegramError(text: string): string {
  return text.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot<redacted>');
}
