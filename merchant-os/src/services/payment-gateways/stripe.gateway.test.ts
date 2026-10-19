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

  it('creates destination checkout without exposing the platform secret', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'cs_test_order', url: 'https://checkout.stripe.com/c/pay/cs_test_order' }) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test', webhookSecret: 'whsec_test' });
    await gateway.createCheckoutSession({ ...input, mode: 'payment', destinationAccountId: 'acct_123ABC', metadata: { kind: 'ORDER', order_id: 'order_1' } });
    const body = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get('payment_intent_data[transfer_data][destination]')).toBe('acct_123ABC');
    expect(body.get('payment_intent_data[metadata][order_id]')).toBe('order_1');
    expect(body.get('subscription_data[metadata][order_id]')).toBeNull();
  });

  it('keeps central store checkout on the platform account when no destination is supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'cs_test_central', url: 'https://checkout.stripe.com/c/pay/cs_test_central' }) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test', webhookSecret: 'whsec_test' });
    await gateway.createCheckoutSession({ ...input, mode: 'payment', metadata: { kind: 'ORDER', order_id: 'order_1' } });
    const body = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get('payment_intent_data[transfer_data][destination]')).toBeNull();
  });

  it('reads Stripe processing fees from the expanded balance transaction', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ latest_charge: { id: 'ch_123', balance_transaction: { amount: 1000, fee: 59, net: 941, currency: 'usd' } } }) });
    vi.stubGlobal('fetch', fetchMock);
    const gateway = new StripeGateway({ enabled: true, secretKey: 'sk_test', webhookSecret: 'whsec_test' });
    await expect(gateway.retrievePaymentCost('pi_123ABC')).resolves.toEqual({ chargeId: 'ch_123', amount: 10, fee: 0.59, net: 9.41, currency: 'USD' });
    expect(fetchMock.mock.calls[0]?.[0]).toContain('expand[]=latest_charge.balance_transaction');
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
