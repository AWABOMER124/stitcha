import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ merchant: vi.fn(), plan: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ default: { merchant: { findUnique: mocks.merchant } } }));
vi.mock('@/modules/merchant-subscriptions/merchant-subscriptions.service', () => ({ getMerchantPlanSnapshot: mocks.plan }));
const { isMerchantEligibleForCentralStripe } = await import('./stripe-payments.service');

describe('store online payment plan boundary', () => {
  beforeEach(() => {
    mocks.merchant.mockResolvedValue({ isActive: true, status: 'ACTIVE', identityVerification: { status: 'APPROVED' }, referralPayoutProfile: { id: 'verified-payout' } });
    mocks.plan.mockReset();
  });
  it('rejects a verified free merchant even with custom feature overrides', async () => {
    mocks.plan.mockResolvedValue({ code: 'FREE', entitlements: { assistedSales: true } });
    expect(await isMerchantEligibleForCentralStripe('free-merchant')).toBe(false);
  });
  it.each(['GROWTH', 'SA_GROWTH', 'PRO', 'SA_PRO', 'BUSINESS', 'SA_BUSINESS'])('preserves verified paid-tier access for %s', async code => {
    mocks.plan.mockResolvedValue({ code, monthlyPrice: 0, isGrandfathered: true });
    expect(await isMerchantEligibleForCentralStripe('paid-merchant')).toBe(true);
  });
  it('does not bypass verification for a paid merchant', async () => {
    mocks.plan.mockResolvedValue({ code: 'SA_PRO' });
    mocks.merchant.mockResolvedValue({ isActive: true, status: 'ACTIVE', identityVerification: { status: 'PENDING' }, referralPayoutProfile: { id: 'payout' } });
    expect(await isMerchantEligibleForCentralStripe('unverified-merchant')).toBe(false);
  });
});
