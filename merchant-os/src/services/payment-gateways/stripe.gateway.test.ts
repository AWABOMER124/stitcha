import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StripeGateway, toMinorUnits } from './stripe.gateway';

const input = {
  mode: 'subscription' as const,
  internalReference: 'merchant_1:plan_pro',
  idempotencyKey: 'upgrade:request_1',
  itemName: 'WASLA Pro monthly plan',
  amount: 10,
  currency: 'USD',
  successUrl: 'https://wasla.example/dashboard/subscription?stripe=success',
  cancelUrl: 'https://wasla.example/dashboard/subscription?stripe=cancelled',
  metadata: { merchant_id: 'merchant_1' },
};

describe('Stripe fail-closed gateway', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not call Stripe while the release flag is disabled', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const gateway = new StripeGateway({ enabled: false, secretKey: 'sk_test', webhookSecret: 'whsec_test' });
    await expect(gateway.createCheckoutSession(input)).rejects.toThrow('not enabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires complete server-side configuration before creating sessions', async () => {
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test' });
    await expect(gateway.createCheckoutSession(input)).rejects.toThrow('not configured');
  });

  it('creates a hosted recurring checkout with server references and idempotency', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test', webhookSecret: 'whsec_test' });
    await expect(gateway.createCheckoutSession(input)).resolves.toMatchObject({ provider: 'STRIPE', sessionId: 'cs_test_1' });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({ Authorization: 'Bearer sk_test', 'Idempotency-Key': 'upgrade:request_1' });
    const body = request.body as URLSearchParams;
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('1000');
    expect(body.get('line_items[0][price_data][recurring][interval]')).toBe('month');
    expect(body.get('metadata[internal_reference]')).toBe('merchant_1:plan_pro');
  });

  it('converts two-decimal and zero-decimal currencies safely', () => {
    expect(toMinorUnits(10.25, 'USD')).toBe(1025);
    expect(toMinorUnits(500, 'JPY')).toBe(500);
    expect(() => toMinorUnits(-1, 'USD')).toThrow('positive');
  });

  it('verifies the raw webhook body, timestamp, and v1 signature', () => {
    const secret = 'whsec_test';
    const raw = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });
    const timestamp = 1_800_000_000;
    const digest = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test', webhookSecret: secret });
    expect(gateway.constructWebhookEvent(raw, `t=${timestamp},v1=${digest}`, new Date(timestamp * 1000))).toMatchObject({ id: 'evt_1' });
    expect(() => gateway.constructWebhookEvent(raw, `t=${timestamp - 301},v1=${digest}`, new Date(timestamp * 1000))).toThrow('Expired');
  });
});
