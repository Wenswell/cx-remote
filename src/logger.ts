import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  file?: string;
  console: boolean;
  prompts: boolean;
}

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let options: LoggerOptions = {
  level: 'info',
  file: 'logs/cx-tg.log',
  console: true,
  prompts: false,
};

export function configureLogger(next: LoggerOptions): void {
  options = next;
  if (options.file) {
    mkdirSync(dirname(options.file), { recursive: true });
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    write('debug', message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    write('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write('warn', message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    write('error', message, meta);
  },
  prompt(message: string, meta?: Record<string, unknown>) {
    if (!options.prompts) return;
    write('info', message, meta, { prompt: true });
  },
};

function write(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  flags?: { prompt?: boolean },
): void {
  if (levelWeight[level] < levelWeight[options.level]) return;

  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts,
    level,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  });

  if (options.console) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(formatConsoleLine(ts, level, message, meta, flags));
  }

  if (options.file) {
    try {
      appendFileSync(options.file, `${line}\n`, 'utf8');
    } catch (error) {
      if (options.console) {
        console.error(JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          message: 'failed to write log file',
          meta: { error: error instanceof Error ? error.message : String(error) },
        }));
      }
    }
  }
}

function formatConsoleLine(
  ts: string,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  flags?: { prompt?: boolean },
): string {
  const time = ts.slice(11, 19);
  const parts = [`${time}`, level.toUpperCase().padEnd(5), message];
  const suffix = formatConsoleMeta(meta, flags);
  return suffix ? `${parts.join(' ')} ${suffix}` : parts.join(' ');
}

function formatConsoleMeta(meta?: Record<string, unknown>, flags?: { prompt?: boolean }): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  if (flags?.prompt) {
    const header = compact([
      asPair('session', meta.sessionKey),
    ]).join(' ');
    const text = typeof meta.text === 'string' ? meta.text : '';
    return text ? `${header}\n${text}` : header;
  }

  const preferred = [
    'sessionKey',
    'channel',
    'chatId',
    'threadId',
    'messageId',
    'toolName',
    'decision',
    'cwd',
    'turnId',
    'error',
    'method',
    'path',
    'status',
    'durationMs',
  ];

  const pairs: string[] = [];
  for (const key of preferred) {
    if (meta[key] !== undefined) pairs.push(asPair(shortKey(key), meta[key]));
  }
  return compact(pairs).slice(0, 6).join(' ');
}

function shortKey(key: string): string {
  switch (key) {
    case 'sessionKey':
      return 'session';
    case 'messageId':
      return 'msg';
    default:
      return key;
  }
}

function asPair(key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return `${key}=${String(value)}`;
}

function compact(values: string[]): string[] {
  return values.filter(Boolean);
}
