import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ default: {} }));
vi.mock('@/modules/merchant-subscriptions', () => ({ requireMerchantEntitlement: vi.fn() }));

const { matchesDnsVerification, normalizeCustomHostname } = await import('./merchant-domains.service');

describe('merchant custom domains', () => {
  it('normalizes safe hostnames and international domains', () => {
    expect(normalizeCustomHostname('Shop.Example.COM/')).toBe('shop.example.com');
    expect(normalizeCustomHostname('متجر.اختبار')).toMatch(/^xn--/);
  });

  it('rejects URLs, ports, wildcards and platform-owned domains', () => {
    for (const hostname of ['example.com/path', 'example.com:443', '*.example.com', 'shop.wassla-sd.shop']) {
      expect(() => normalizeCustomHostname(hostname)).toThrow();
    }
  });

  it('accepts only the exact DNS ownership token', () => {
    expect(matchesDnsVerification([['wasla-verification=', 'secret']], 'secret')).toBe(true);
    expect(matchesDnsVerification([['wasla-verification=wrong']], 'secret')).toBe(false);
  });
});
