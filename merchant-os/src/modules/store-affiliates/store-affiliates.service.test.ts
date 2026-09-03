import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ default: {} }));

const { affiliateCookiePath, affiliateTokenHash, normalizeAffiliateCode } = await import('./store-affiliates.service');

describe('store affiliate primitives', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', 'store-affiliate-test-secret'));

  it('normalizes only bounded opaque codes', () => {
    expect(normalizeAffiliateCode(' aff-ab12cd ')).toBe('AFF-AB12CD');
    expect(normalizeAffiliateCode('bad code')).toBeNull();
    expect(normalizeAffiliateCode('x'.repeat(33))).toBeNull();
  });

  it('stores a keyed token fingerprint rather than the browser token', () => {
    const token = 'private-browser-token';
    expect(affiliateTokenHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(affiliateTokenHash(token)).not.toContain(token);
  });

  it('scopes the attribution cookie to the matching store order API', () => {
    expect(affiliateCookiePath('nile-store')).toBe('/api/store/nile-store');
  });
});
