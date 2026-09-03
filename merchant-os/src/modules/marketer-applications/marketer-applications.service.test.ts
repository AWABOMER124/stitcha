import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ default: {} }));

const { applicationIdentityKey } = await import('./marketer-applications.service');

describe('marketer application identity', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is stable for one program target and separates different targets', () => {
    vi.stubEnv('AUTH_SECRET', 'test-only-marketer-secret');
    const first = applicationIdentityKey('STOREFRONT_PRODUCTS', 'merchant_1', '+249915970000');
    expect(first).toHaveLength(64);
    expect(applicationIdentityKey('STOREFRONT_PRODUCTS', 'merchant_1', '+249915970000')).toBe(first);
    expect(applicationIdentityKey('STOREFRONT_PRODUCTS', 'merchant_2', '+249915970000')).not.toBe(first);
    expect(applicationIdentityKey('MERCHANT_ACQUISITION', undefined, '+249915970000')).not.toBe(first);
  });

  it('fails closed when the application fingerprint secret is missing', () => {
    vi.stubEnv('AUTH_SECRET', '');
    expect(() => applicationIdentityKey('MERCHANT_ACQUISITION', undefined, '+249915970000')).toThrow();
  });
});
