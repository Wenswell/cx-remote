import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CODEX_MODEL_OPTIONS } from '../../domain/types.js';

export interface CodexRuntimeDefaults {
  model: string;
  reasoningEffort: string;
}

const DEFAULT_REASONING_BY_MODEL: Record<string, string> = {
  'gpt-5.5': 'medium',
  'gpt-5.4': 'medium',
};

export function resolveCodexRuntimeDefaults(): CodexRuntimeDefaults {
  const config = readCodexTopLevelConfig();
  const model = config.model || CODEX_MODEL_OPTIONS[0];
  return {
    model,
    reasoningEffort: config.modelReasoningEffort || DEFAULT_REASONING_BY_MODEL[model] || 'medium',
  };
}

function readCodexTopLevelConfig(): { model?: string; modelReasoningEffort?: string } {
  const path = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'config.toml');
  if (!existsSync(path)) return {};

  const values: { model?: string; modelReasoningEffort?: string } = {};
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) break;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(trimmed);
    if (!match) continue;

    if (match[1] === 'model') values.model = parseTomlString(match[2], 'model');
    if (match[1] === 'model_reasoning_effort') {
      values.modelReasoningEffort = parseTomlString(match[2], 'model_reasoning_effort');
    }
  }
  return values;
}

function parseTomlString(rawValue: string, key: string): string {
  const value = rawValue.trim();
  const basic = /^"((?:\\.|[^"\\])*)"/.exec(value);
  if (basic) return JSON.parse(`"${basic[1]}"`) as string;
  const literal = /^'([^']*)'/.exec(value);
  if (literal) return literal[1];
  throw new Error(`Codex config key ${key} must be a TOML string`);
}
