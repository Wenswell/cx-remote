import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { findSettingField } from '../src/config/fields.js';
import { loadConfig, maskSettings } from '../src/config/config.js';

test('notifications.feishu.webhook is a secret config field', () => {
  const field = findSettingField('notifications.feishu.webhook');
  assert.equal(field.env, 'FEISHU_BOT_WEBHOOK');
  assert.equal(field.secret, true);
});

test('loadConfig resolves Feishu webhook from settings and environment', () => {
  const previousHome = process.env.CX_REMOTE_HOME;
  const previousSettings = process.env.CX_REMOTE_SETTINGS;
  const previousWebhook = process.env.FEISHU_BOT_WEBHOOK;
  const tempHome = mkdtempSync(join(tmpdir(), 'cx-remote-config-'));

  try {
    process.env.CX_REMOTE_HOME = tempHome;
    delete process.env.CX_REMOTE_SETTINGS;
    delete process.env.FEISHU_BOT_WEBHOOK;

    const generated = loadConfig();
    assert.equal(generated.config.notifications.feishu.webhook, '');

    process.env.FEISHU_BOT_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/from-env';
    const resolved = loadConfig();

    assert.equal(resolved.config.notifications.feishu.webhook, 'https://open.feishu.cn/open-apis/bot/v2/hook/from-env');
    assert.notEqual(maskSettings(resolved.config).notifications.feishu.webhook, resolved.config.notifications.feishu.webhook);
  } finally {
    if (previousHome === undefined) {
      delete process.env.CX_REMOTE_HOME;
    } else {
      process.env.CX_REMOTE_HOME = previousHome;
    }
    if (previousSettings === undefined) {
      delete process.env.CX_REMOTE_SETTINGS;
    } else {
      process.env.CX_REMOTE_SETTINGS = previousSettings;
    }
    if (previousWebhook === undefined) {
      delete process.env.FEISHU_BOT_WEBHOOK;
    } else {
      process.env.FEISHU_BOT_WEBHOOK = previousWebhook;
    }
    rmSync(tempHome, { recursive: true, force: true });
  }
});
