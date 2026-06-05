import { hostname, userInfo } from 'node:os';
import { asRecord } from '../utils.js';
const maxInlineUserChars = 240;
const maxHeaderReplyChars = 96;
const maxAnswerPreviewChars = 360;
export async function forwardNotify(payloadInput, options = {}) {
    const payload = parsePayload(payloadInput);
    if (payload.client !== 'codex-tui') {
        return { sent: false, skippedReason: 'non-main conversation' };
    }
    const webhook = options.webhook;
    if (!webhook)
        throw new Error('notifications.feishu.webhook is required');
    validateWebhook(webhook);
    await postFeishu(webhook, {
        msg_type: 'interactive',
        card: buildCard(payload),
    }, options.fetchImpl ?? fetch);
    return { sent: true };
}
function parsePayload(value) {
    const payload = asRecord(value);
    if (!payload)
        throw new Error('Codex notify payload must be a JSON object');
    return payload;
}
function validateWebhook(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('webhook must be an http or https URL');
    }
}
function buildCard(payload) {
    const input = readInputMessages(payload['input-messages']);
    const answer = payload['last-assistant-message'] ??
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
function buildHeaderTitle(answerText, payload) {
    const summary = formatHeaderPreview(answerText);
    return summary ? truncate(summary, maxHeaderReplyChars) : (payload.type ?? 'codex notify');
}
function formatHeaderPreview(value) {
    return compactInline(normalizeHeaderPunctuation(stripMarkdownDecoration(value)));
}
function stripMarkdownDecoration(value) {
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
function normalizeHeaderPunctuation(value) {
    return value
        .replace(/，/g, ',')
        .replace(/。/g, '.')
        .replace(/：/g, ':')
        .replace(/；/g, ';')
        .replace(/！/g, '!')
        .replace(/？/g, '?')
        .replace(/、/g, ',');
}
function getHeaderTemplate(payload) {
    const type = payload.type?.toLowerCase() ?? '';
    return type.includes('error') || type.includes('fail') ? 'red' : 'blue';
}
function readInputMessages(value) {
    if (Array.isArray(value)) {
        const all = value.filter((item) => typeof item === 'string' && item.trim().length > 0);
        return { latest: all.at(-1) ?? '' };
    }
    if (typeof value === 'string' && value.trim()) {
        return { latest: value };
    }
    return { latest: '' };
}
function truncate(value, maxChars) {
    return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
}
function compactInline(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function splitPreview(value, maxChars) {
    if (value.length <= maxChars) {
        return { preview: value, rest: '' };
    }
    const splitAt = findPreviewSplitIndex(value, maxChars);
    return {
        preview: `${value.slice(0, splitAt).trimEnd()}...`,
        rest: value.slice(splitAt).trimStart(),
    };
}
function findPreviewSplitIndex(value, maxChars) {
    const window = value.slice(0, maxChars);
    const paragraphBreak = window.lastIndexOf('\n\n');
    if (paragraphBreak >= Math.floor(maxChars * 0.45))
        return paragraphBreak;
    const lineBreak = window.lastIndexOf('\n');
    if (lineBreak >= Math.floor(maxChars * 0.65))
        return lineBreak;
    const space = window.lastIndexOf(' ');
    if (space >= Math.floor(maxChars * 0.75))
        return space;
    return maxChars;
}
function buildCollapsibleReply(content) {
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
function formatSystemLabel() {
    const username = process.env.USER || process.env.LOGNAME || userInfo().username || 'unknown';
    const host = (process.env.HOSTNAME || hostname() || 'unknown').split('.')[0] || 'unknown';
    return `${username}@${host}`;
}
function formatLocalTimestamp(date) {
    const pad = (value) => value.toString().padStart(2, '0');
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
function formatHomePath(path) {
    const home = userInfo().homedir;
    if (path === home)
        return '~';
    return path.startsWith(`${home}/`) ? `~/${path.slice(home.length + 1)}` : path;
}
async function postFeishu(url, body, fetchImpl) {
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
    const responseJson = result;
    if (responseJson.code !== 0 && responseJson.StatusCode !== 0) {
        throw new Error(`Feishu webhook rejected message: ${text}`);
    }
}
function parseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
