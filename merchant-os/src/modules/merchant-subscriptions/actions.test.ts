import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), request: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth/session', () => ({ getCurrentMerchant: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('./merchant-subscriptions.service', () => ({ requestPlanChange: mocks.request }));
const { beginSubscriptionCheckoutAction } = await import('./actions');

describe('direct subscription checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'owner', merchantId: 'merchant-a', role: 'MERCHANT_OWNER' } });
    mocks.request.mockResolvedValue({ id: 'quote-a' });
    mocks.redirect.mockImplementation(() => { throw new Error('NEXT_REDIRECT'); });
  });
  it('prepares an exact yearly quote and redirects without swallowing navigation', async () => {
    await expect(beginSubscriptionCheckoutAction({ targetPlanCode: 'SA_GROWTH', billingInterval: 'YEARLY' })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.request).toHaveBeenCalledWith('merchant-a', 'SA_GROWTH', undefined, 'YEARLY', { notifyPlatform: false });
    expect(mocks.redirect).toHaveBeenCalledWith('/dashboard/subscription/checkout?request=quote-a');
  });
  it('does not let staff or anonymous visitors prepare subscription payments', async () => {
    for (const user of [null, { merchantId: 'merchant-a', role: 'CASHIER' }]) {
      mocks.auth.mockResolvedValue(user ? { user } : null);
      expect((await beginSubscriptionCheckoutAction({ targetPlanCode: 'SA_GROWTH' })).success).toBe(false);
    }
    expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
