import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), checkout: vi.fn() }));
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }));
vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: () => true, getClientIp: () => 'test' }));
vi.mock('@/lib/public-origin', () => ({ resolvePublicOrigin: () => 'https://wasla.example' }));
vi.mock('@/modules/paymob-payments/market-payments.service', () => ({ createMarketSubscriptionCheckout: mocks.checkout }));
const { POST } = await import('./route');
const post = (body?: string) => POST(new Request('https://wasla.example/api/subscriptions/checkout', { method: 'POST', body }));
describe('subscription payment selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { merchantId: 'merchant-a', email: 'synthetic@example.com', role: 'MERCHANT_OWNER' } });
    mocks.checkout.mockResolvedValue({ checkoutUrl: 'https://gateway.example/checkout' });
  });
  it('passes the selected quote with the signed-in merchant, never a client merchant', async () => {
    expect((await post(JSON.stringify({ planChangeRequestId: 'selected-quote' }))).status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 'merchant-a', planChangeRequestId: 'selected-quote' }));
    expect((await post(JSON.stringify({ planChangeRequestId: 'selected-quote', merchantId: 'other' }))).status).toBe(400);
  });
  it('keeps old open tabs compatible when they send no body', async () => {
    expect((await post()).status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 'merchant-a', planChangeRequestId: undefined }));
  });
  it('rejects malformed selections before contacting a gateway', async () => {
    for (const body of ['{', '{"planChangeRequestId":""}', '{"planChangeRequestId":7}']) expect((await post(body)).status).toBe(400);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it('does not allow cashier or anonymous checkout', async () => {
    mocks.auth.mockResolvedValue({ user: { merchantId: 'merchant-a', role: 'CASHIER' } });
    expect((await post()).status).toBe(401);
    mocks.auth.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});
