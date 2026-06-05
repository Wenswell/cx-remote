import { readFile } from 'node:fs/promises';
import { hostname, userInfo } from 'node:os';
import { join } from 'node:path';
import { defaultConfigHome } from '../config/config.js';
import { asRecord } from '../utils.js';

export type CodexNotifyPayload = {
  type?: string;
  client?: string;
  cwd?: string;
  'input-messages'?: unknown;
  'last-assistant-message'?: string;
  last_assistant_message?: string;
  lastAssistantMessage?: string;
  [key: string]: unknown;
};

export type NotifyForwardResult = {
  sent: boolean;
  skippedReason?: string;
};

type FeishuCardBody = {
  msg_type: 'interactive';
  card: {
    schema: '2.0';
    header: {
      template: 'blue' | 'red';
      title: {
        tag: 'plain_text';
        content: string;
      };
    };
    body: {
      elements: Array<
        | { tag: 'markdown'; content: string }
        | { tag: 'hr' }
        | {
            tag: 'column_set';
            flex_mode: 'none';
            background_style: 'grey';
            columns: Array<{
              tag: 'column';
              width: 'weighted';
              weight: number;
              elements: Array<{ tag: 'markdown'; content: string }>;
            }>;
          }
        | {
            tag: 'collapsible_panel';
            expanded: false;
            header: {
              title: {
                tag: 'markdown';
                content: string;
              };
              vertical_align: 'center';
              icon: {
                tag: 'standard_icon';
                token: string;
                color: '';
                size: string;
              };
              icon_position: 'right';
              icon_expanded_angle: number;
            };
            border: {
              color: 'grey';
              corner_radius: string;
            };
            vertical_spacing: string;
            padding: string;
            elements: Array<{ tag: 'markdown'; content: string }>;
          }
      >;
    };
  };
};

const maxInlineUserChars = 240;
const maxHeaderReplyChars = 96;
const maxAnswerPreviewChars = 360;

export function defaultNoticeEnvPath(): string {
  return join(defaultConfigHome(), 'notice.env');
}

export async function forwardNotify(payloadInput: unknown, options: {
  fetchImpl?: typeof fetch;
  webhook?: string;
  env?: NodeJS.ProcessEnv;
  noticeEnvPath?: string;
} = {}): Promise<NotifyForwardResult> {
  const payload = parsePayload(payloadInput);
  if (payload.client !== 'codex-tui') {
    return { sent: false, skippedReason: 'non-main conversation' };
  }

  const webhook = options.webhook || await readWebhook(options.env ?? process.env, options.noticeEnvPath ?? defaultNoticeEnvPath());
  if (!webhook) {
    throw new Error('FEISHU_BOT_WEBHOOK is required in environment or ~/.cx-remote/notice.env');
  }
  validateWebhook(webhook);

  await postFeishu(
    webhook,
    {
      msg_type: 'interactive',
      card: buildCard(payload),
    },
    options.fetchImpl ?? fetch,
  );

  return { sent: true };
}

function parsePayload(value: unknown): CodexNotifyPayload {
  const payload = asRecord(value);
  if (!payload) throw new Error('Codex notify payload must be a JSON object');
  return payload as CodexNotifyPayload;
}

async function readWebhook(env: NodeJS.ProcessEnv, filePath: string): Promise<string> {
  const webhook = env.FEISHU_BOT_WEBHOOK || await readWebhookFromFile(filePath);
  if (!webhook) return '';
  validateWebhook(webhook);
  return webhook;
}

async function readWebhookFromFile(filePath: string): Promise<string> {
  let text = '';
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^(?:export\s+)?FEISHU_BOT_WEBHOOK\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    return stripEnvQuotes(match[1].trim());
  }

  return '';
}

function validateWebhook(value: string): void {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('webhook must be an http or https URL');
  }
}

function buildCard(payload: CodexNotifyPayload): FeishuCardBody['card'] {
  const input = readInputMessages(payload['input-messages']);
  const answer =
    payload['last-assistant-message'] ??
    payload.last_assistant_message ??
    payload.lastAssistantMessage;
  const answerText = answer ?? `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
  const title = buildHeaderTitle(answerText, payload);
  const answerParts = splitPreview(answerText, maxAnswerPreviewChars);

  return {
    schema: '2.0',
    header: {
      template: getHeaderTemplate(payload),
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    body: {
      elements: [
        {
          tag: 'column_set',
          flex_mode: 'none',
          background_style: 'grey',
          columns: [
            {
              tag: 'column',
              width: 'weighted',
              weight: 1,
              elements: [
                {
                  tag: 'markdown',
                  content: `🕒 ${formatLocalTimestamp(new Date())}  👤 ${formatSystemLabel()}`,
                },
              ],
            },
          ],
        },
        {
          tag: 'column_set',
          flex_mode: 'none',
          background_style: 'grey',
          columns: [
            {
              tag: 'column',
              width: 'weighted',
              weight: 1,
              elements: [
                {
                  tag: 'markdown',
                  content: `📁 ${payload.cwd ? formatHomePath(payload.cwd) : '-'}`,
                },
              ],
            },
          ],
        },
        {
          tag: 'column_set',
          flex_mode: 'none',
          background_style: 'grey',
          columns: [
            {
              tag: 'column',
              width: 'weighted',
              weight: 1,
              elements: [
                {
                  tag: 'markdown',
                  content: `💬 ${input.latest ? truncate(input.latest, maxInlineUserChars) : '-'}`,
                },
              ],
            },
          ],
        },
        { tag: 'hr' },
        {
          tag: 'markdown',
          content: answerParts.preview,
        },
        ...(answerParts.rest ? [buildCollapsibleReply(answerParts.rest)] : []),
      ],
    },
  };
}

function buildHeaderTitle(answerText: string, payload: CodexNotifyPayload): string {
  const summary = formatHeaderPreview(answerText);
  return summary ? truncate(summary, maxHeaderReplyChars) : (payload.type ?? 'codex notify');
}

function formatHeaderPreview(value: string): string {
  return compactInline(normalizeHeaderPunctuation(stripMarkdownDecoration(value)));
}

function stripMarkdownDecoration(value: string): string {
  return value
    .replace(/```[a-zA-Z0-9_-]*\s*/g, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\s)[*_]{1,3}([^*_]+)[*_]{1,3}(\s|$)/g, '$1$2$3')
    .replace(/(^|\s)>+\s*/g, '$1')
    .replace(/(^|\s)(?:[-*+]|\d+[.)])\s+/g, '$1');
}

function normalizeHeaderPunctuation(value: string): string {
  return value
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/、/g, ',');
}

function getHeaderTemplate(payload: CodexNotifyPayload): 'blue' | 'red' {
  const type = payload.type?.toLowerCase() ?? '';
  return type.includes('error') || type.includes('fail') ? 'red' : 'blue';
}

function readInputMessages(value: unknown): { latest: string } {
  if (Array.isArray(value)) {
    const all = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return { latest: all.at(-1) ?? '' };
  }
  if (typeof value === 'string' && value.trim()) {
    return { latest: value };
  }
  return { latest: '' };
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}

function compactInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitPreview(value: string, maxChars: number): { preview: string; rest: string } {
  if (value.length <= maxChars) {
    return { preview: value, rest: '' };
  }
  const splitAt = findPreviewSplitIndex(value, maxChars);
  return {
    preview: `${value.slice(0, splitAt).trimEnd()}...`,
    rest: value.slice(splitAt).trimStart(),
  };
}

function findPreviewSplitIndex(value: string, maxChars: number): number {
  const window = value.slice(0, maxChars);
  const paragraphBreak = window.lastIndexOf('\n\n');
  if (paragraphBreak >= Math.floor(maxChars * 0.45)) return paragraphBreak;
  const lineBreak = window.lastIndexOf('\n');
  if (lineBreak >= Math.floor(maxChars * 0.65)) return lineBreak;
  const space = window.lastIndexOf(' ');
  if (space >= Math.floor(maxChars * 0.75)) return space;
  return maxChars;
}

function buildCollapsibleReply(content: string): FeishuCardBody['card']['body']['elements'][number] {
  return {
    tag: 'collapsible_panel',
    expanded: false,
    header: {
      title: {
        tag: 'markdown',
        content: '**剩余回复（点击展开）**',
      },
      vertical_align: 'center',
      icon: {
        tag: 'standard_icon',
        token: 'down-small-ccm_outlined',
        color: '',
        size: '16px 16px',
      },
      icon_position: 'right',
      icon_expanded_angle: -180,
    },
    border: {
      color: 'grey',
      corner_radius: '5px',
    },
    vertical_spacing: '8px',
    padding: '8px 8px 8px 8px',
    elements: [
      {
        tag: 'markdown',
        content,
      },
    ],
  };
}

function formatSystemLabel(): string {
  const username = process.env.USER || process.env.LOGNAME || userInfo().username || 'unknown';
  const host = (process.env.HOSTNAME || hostname() || 'unknown').split('.')[0] || 'unknown';
  return `${username}@${host}`;
}

function formatLocalTimestamp(date: Date): string {
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds()),
  ].join('');
}

function formatHomePath(path: string): string {
  const home = userInfo().homedir;
  if (path === home) return '~';
  return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path;
}

async function postFeishu(
  url: string,
  body: FeishuCardBody,
  fetchImpl: typeof fetch,
): Promise<void> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const result = parseJson(text);

  if (!response.ok) {
    throw new Error(`Feishu webhook failed: ${response.status} ${text}`);
  }

  const responseJson = result as { code?: number; StatusCode?: number; msg?: string };
  if (responseJson.code !== 0 && responseJson.StatusCode !== 0) {
    throw new Error(`Feishu webhook rejected message: ${text}`);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
