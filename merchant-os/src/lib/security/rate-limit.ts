import { RateLimitError } from '@/lib/errors';

/**
 * In-memory sliding/fixed-window rate limiter, keyed by an arbitrary string
 * (typically `ip:route`). Suitable for a single Node.js instance (this
 * project's Docker deployment); a multi-instance deployment would need a
 * shared store (Redis) instead — buckets here are per-process.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bounds memory growth from one-off/attacker IPs without needing a timer.
const MAX_BUCKETS = 50_000;
let opsSinceSweep = 0;

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Returns true if the call is allowed, false if the limit was exceeded. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  opsSinceSweep++;
  if (opsSinceSweep >= 1000 || buckets.size > MAX_BUCKETS) {
    sweepExpired(now);
    opsSinceSweep = 0;
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** Throws RateLimitError if the limit was exceeded. */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  if (!checkRateLimit(key, limit, windowMs)) {
    throw new RateLimitError();
  }
}

/** Best-effort client IP extraction behind a reverse proxy (nginx, per this project's Dockerfile). */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/** Clears all buckets. Test-only. */
export function _resetRateLimitsForTests(): void {
  buckets.clear();
  opsSinceSweep = 0;
}
