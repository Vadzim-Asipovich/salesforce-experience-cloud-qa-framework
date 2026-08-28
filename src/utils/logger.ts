import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Patterns that must never reach a log line unredacted. */
const SECRET_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  { re: /(Bearer\s+)[\w.-]+/gi, replacement: '$1[REDACTED]' },
  { re: /("access_token"\s*:\s*")[^"]+(")/gi, replacement: '$1[REDACTED]$2' },
  { re: /("client_secret"\s*:\s*")[^"]+(")/gi, replacement: '$1[REDACTED]$2' },
  {
    re: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g,
    replacement: '$1[REDACTED]$2',
  },
];

/** Recursively masks known-sensitive keys in an object before it's logged. */
const SENSITIVE_KEYS = new Set([
  'authorization',
  'access_token',
  'client_secret',
  'password',
  'assertion',
]);

function maskString(input: string): string {
  return SECRET_PATTERNS.reduce((acc, { re, replacement }) => acc.replace(re, replacement), input);
}

function maskValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return maskString(value);
  if (Array.isArray(value)) return value.map((v) => maskValue(v, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]';
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : maskValue(v, seen);
    }
    return out;
  }
  return value;
}

function log(level: Level, message: string, meta?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[env.LOG_LEVEL]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${maskString(message)}`;
  const payload = meta === undefined ? '' : ` ${JSON.stringify(maskValue(meta))}`;
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(
    line + payload,
  );
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  /** Exposed for tests that assert secrets never leak into a log line. */
  _maskString: maskString,
};
