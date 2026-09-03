import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ default: {} }));
const { normalizeReferralCode, referralIdentityFingerprint } = await import('./merchant-referrals.service');

describe('merchant referral primitives', () => {
  beforeEach(() => vi.stubEnv('AUTH_SECRET', 'unit-test-referral-secret'));

  it('normalizes only bounded referral codes', () => {
    expect(normalizeReferralCode(' wsl-ab12 ')).toBe('WSL-AB12');
    expect(normalizeReferralCode('bad code')).toBeNull();
    expect(normalizeReferralCode('x'.repeat(33))).toBeNull();
  });

  it('binds a private fingerprint to both normalized email and phone', () => {
    const one = referralIdentityFingerprint(' User@Example.com ', '+249911111111');
    expect(one).toMatch(/^[a-f0-9]{64}$/);
    expect(one).toBe(referralIdentityFingerprint('user@example.com', '+249911111111'));
    expect(one).not.toBe(referralIdentityFingerprint('user@example.com', '+249922222222'));
    expect(one).not.toContain('user@example.com');
  });
});
