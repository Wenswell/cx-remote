import { strict as assert } from 'node:assert';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveCodexRuntimeDefaults } from '../src/agents/codex/defaults.js';

test('resolveCodexRuntimeDefaults reads top-level Codex config', () => {
  const previousHome = process.env.CODEX_HOME;
  const tempDir = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));

  try {
    process.env.CODEX_HOME = tempDir;
    writeFileSync(join(tempDir, 'config.toml'), [
      'model_reasoning_effort = "xhigh" # comment',
      "model = 'gpt-5.4'",
      '',
      '[profiles.worker]',
      'model = "gpt-5.5"',
      'model_reasoning_effort = "medium"',
    ].join('\n'));

    assert.deepEqual(resolveCodexRuntimeDefaults(), {
      model: 'gpt-5.4',
      reasoningEffort: 'xhigh',
    });
  } finally {
    if (previousHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = previousHome;
    }
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveCodexRuntimeDefaults uses bundled defaults without Codex config', () => {
  const previousHome = process.env.CODEX_HOME;
  const tempDir = mkdtempSync(join(tmpdir(), 'cx-tg-codex-home-'));

  try {
    process.env.CODEX_HOME = tempDir;
    assert.deepEqual(resolveCodexRuntimeDefaults(), {
      model: 'gpt-5.5',
      reasoningEffort: 'medium',
    });
  } finally {
    if (previousHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = previousHome;
    }
    rmSync(tempDir, { recursive: true, force: true });
  }
});
