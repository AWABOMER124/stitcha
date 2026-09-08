import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ default: {} }));
const { normalizeMarketerReferralCode, normalizeMerchantStoreSlug } = await import('./marketer-referrals.service');

describe('marketer referral inputs', () => {
  it('normalizes marketer codes regardless of casing and numeral form', () => {
    expect(normalizeMarketerReferralCode(' mk-a1b2c3 ')).toBe('MK-A1B2C3');
    expect(normalizeMarketerReferralCode('MK-A١B٢C٣')).toBe('MK-A1B2C3');
    expect(normalizeMarketerReferralCode('invalid code')).toBeNull();
  });

  it('accepts a slug, storefront path, and full storefront URL', () => {
    expect(normalizeMerchantStoreSlug('mexico-phone')).toBe('mexico-phone');
    expect(normalizeMerchantStoreSlug('/store/mexico-phone')).toBe('mexico-phone');
    expect(normalizeMerchantStoreSlug('https://wassla-sd.shop/store/mexico-phone?ref=abc')).toBe('mexico-phone');
    expect(normalizeMerchantStoreSlug('متجر غير صالح')).toBeNull();
  });
});
