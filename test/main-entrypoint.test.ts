import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { isEntrypoint } from '../src/main.js';

test('isEntrypoint resolves symlink argv paths', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cx-remote-entry-'));
  const target = join(process.cwd(), 'src', 'main.ts');
  const link = join(tempDir, 'cx-remote');

  try {
    symlinkSync(target, link);
    assert.equal(isEntrypoint(pathToFileURL(target).href, link), true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('isEntrypoint rejects missing argv path', () => {
  assert.equal(isEntrypoint(pathToFileURL(join(process.cwd(), 'src', 'main.ts')).href, undefined), false);
});
