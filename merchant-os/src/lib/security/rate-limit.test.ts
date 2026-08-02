import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, enforceRateLimit, getClientIp, _resetRateLimitsForTests } from './rate-limit';
import { RateLimitError } from '@/lib/errors';

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitsForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('k1', 5, 1000)).toBe(true);
    }
  });

  it('blocks once the limit is exceeded within the window', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('k2', 5, 1000);
    expect(checkRateLimit('k2', 5, 1000)).toBe(false);
  });

  it('resets the count after the window elapses', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('k3', 5, 1000);
    expect(checkRateLimit('k3', 5, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit('k3', 5, 1000)).toBe(true);
  });

  it('tracks separate keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('a', 5, 1000);
    expect(checkRateLimit('a', 5, 1000)).toBe(false);
    expect(checkRateLimit('b', 5, 1000)).toBe(true);
  });
});

describe('enforceRateLimit', () => {
  beforeEach(() => _resetRateLimitsForTests());

  it('throws RateLimitError once the limit is exceeded', () => {
    for (let i = 0; i < 3; i++) enforceRateLimit('enforce-key', 3, 1000);
    expect(() => enforceRateLimit('enforce-key', 3, 1000)).toThrow(RateLimitError);
  });
});

describe('getClientIp', () => {
  it('reads the first entry of x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
