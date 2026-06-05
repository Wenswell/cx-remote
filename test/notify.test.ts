import { strict as assert } from 'node:assert';
import test from 'node:test';
import { forwardNotify } from '../src/controls/notify.js';

test('forwardNotify sends Feishu card for main Codex TUI payloads', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const result = await forwardNotify({
    type: 'agent-turn-complete',
    client: 'codex-tui',
    cwd: process.cwd(),
    'input-messages': ['first prompt', 'latest prompt'],
    'last-assistant-message': '**Done** with `result`',
  }, {
    webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
    fetchImpl: (async (input: Request | string | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as unknown,
      });
      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    }) as typeof fetch,
  });

  assert.equal(result.sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, 'https://open.feishu.cn/open-apis/bot/v2/hook/test');

  const body = calls[0]?.body as {
    msg_type?: string;
    card?: {
      header?: { title?: { content?: string } };
      body?: { elements?: Array<{ tag?: string; content?: string; columns?: Array<{ elements?: Array<{ content?: string }> }> }> };
    };
  };
  assert.equal(body.msg_type, 'interactive');
  assert.equal(body.card?.header?.title?.content, 'Done with result');
  const metaText = JSON.stringify(body.card?.body?.elements);
  assert.match(metaText, /latest prompt/);
  assert.match(metaText, /Done/);
});

test('forwardNotify skips non-main Codex payloads without calling Feishu', async () => {
  let called = false;
  const result = await forwardNotify({
    type: 'agent-turn-complete',
    client: 'subagent',
    'last-assistant-message': 'subagent reply',
  }, {
    webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
    fetchImpl: (async () => {
      called = true;
      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    }) as typeof fetch,
  });

  assert.equal(result.sent, false);
  assert.equal(result.skippedReason, 'non-main conversation');
  assert.equal(called, false);
});

test('forwardNotify rejects missing Feishu webhook', async () => {
  await assert.rejects(
    forwardNotify({
      type: 'agent-turn-complete',
      client: 'codex-tui',
      'last-assistant-message': 'missing webhook',
    }),
    /notifications\.feishu\.webhook is required/,
  );
});
