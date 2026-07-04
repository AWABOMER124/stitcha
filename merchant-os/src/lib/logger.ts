/**
 * @module logger
 * @description Minimal structured logger for server-side code (API routes,
 * Server Actions, background work). Writes newline-delimited JSON to
 * stdout/stderr so it shows up in `docker logs` / Dokploy's log viewer.
 *
 * This intentionally has no external dependency (Sentry, Pino, etc.) — swap
 * the `write` function below for a real APM/log shipper when one is chosen;
 * every call site already goes through this module.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'token', 'tokenhash', 'secret', 'authorization', 'cookie',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(val);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  /** Verbose, dev-only diagnostics — never printed in production. */
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') write('debug', message, meta);
  },
  info(message: string, meta?: Record<string, unknown>) {
    write('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write('warn', message, meta);
  },
  /** Always logged, in every environment — this is what production incident triage relies on. */
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    write('error', message, {
      ...(meta ?? {}),
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    });
  },
};
