import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PaymobGateway, PAYMOB_SA_ORIGIN, paymobSignatureText, paymobPhone, type PaymobConfig } from './paymob.gateway';
import { paymentProviderForMarket } from './market-policy';

const config: PaymobConfig = { enabled: true, mode: 'TEST', secretKey: 'ksa_sk_test_synthetic_only', publicKey: 'ksa_pk_test_synthetic_only', apiKey: 'synthetic-inquiry-key-only', hmacSecret: 'synthetic-hmac-secret-only', integrationIds: [6741] };
const transaction = { amount_cents: 100, created_at: '2020-03-25T18:39:44.719228', currency: 'SAR', error_occured: false, has_parent_transaction: false,
  id: 2556706, integration_id: 6741, is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false, is_standalone_payment: true,
  is_voided: false, order: { id: 4778239 }, owner: 4705, pending: false, source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' }, success: true };
const text = '1002020-03-25T18:39:44.719228SARfalsefalse25567066741truefalsefalsefalsetruefalse47782394705false2346MasterCardcardtrue';

describe('Saudi gateway routing', () => {
  it('uses the business market, independently of currency or visitor IP', () => {
    expect(paymentProviderForMarket('SA')).toBe('PAYMOB');
    for (const country of ['SD', 'GB', 'AE', undefined, null]) expect(paymentProviderForMarket(country)).toBe('STRIPE');
  });
});

describe('Paymob gateway', () => {
  it('preserves international phone numbers and normalizes Saudi local numbers once', () => {
    for (const value of ['0500000000', '500000000', '966500000000', '+966500000000', '00966500000000']) expect(paymobPhone(value)).toBe('+966500000000');
    expect(paymobPhone('+249900000000')).toBe('+249900000000');
  });
  it('matches the documented transaction concatenation order', () => { expect(paymobSignatureText(transaction)).toBe(text); });
  it('accepts an authentic signature and rejects amount tampering', () => {
    const gateway = new PaymobGateway(config);
    const hmac = createHmac('sha512', config.hmacSecret!).update(text).digest('hex');
    expect(gateway.verifyCallback(JSON.stringify({ type: 'TRANSACTION', obj: transaction }), hmac).id).toBe(2556706);
    expect(() => gateway.verifyCallback(JSON.stringify({ type: 'TRANSACTION', obj: { ...transaction, amount_cents: 101 } }), hmac)).toThrow('Invalid Paymob signature');
  });
  it.each([null, '', 'abc', '0'.repeat(126), 'g'.repeat(128)])('rejects malformed signatures', signature => {
    expect(() => new PaymobGateway(config).verifyCallback(JSON.stringify({ type: 'TRANSACTION', obj: transaction }), signature)).toThrow();
  });
  it('rejects unsigned or unknown fields in the signed field list', () => {
    expect(() => paymobSignatureText({ ...transaction, source_data: { pan: null, type: 'card', sub_type: 'MADA' } })).toThrow('Incomplete');
    expect(() => paymobSignatureText({ ...transaction, order: {} })).toThrow('Incomplete');
  });
  it('does not accept another integration or currency, even with a valid signature', () => {
    for (const data of [{ ...transaction, integration_id: 9999 }, { ...transaction, currency: 'USD' }]) {
      const signature = createHmac('sha512', config.hmacSecret!).update(paymobSignatureText(data)).digest('hex');
      expect(() => new PaymobGateway(config).verifyCallback(JSON.stringify({ type: 'TRANSACTION', obj: data }), signature)).toThrow('Unexpected');
    }
  });
  it('creates SAR intentions on the fixed Saudi origin with a server notification URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'pi_synthetic', intention_order_id: 55, client_secret: 'synthetic-client-secret' }), { status: 201 }));
    const gateway = new PaymobGateway(config, fetcher);
    const result = await gateway.createIntention({ reference: 'internal-attempt', amountMinor: 4900, itemName: 'Synthetic plan', phone: '+966500000000', firstName: 'Synthetic', lastName: 'Customer', notificationUrl: 'https://synthetic.example/api/paymob/webhook', returnUrl: 'https://synthetic.example/return' });
    const [url, options] = fetcher.mock.calls[0]; const body = JSON.parse(options.body);
    expect(url).toBe(PAYMOB_SA_ORIGIN + '/v1/intention/');
    expect(body).toMatchObject({ currency: 'SAR', amount: 4900, special_reference: 'internal-attempt', payment_methods: [6741] });
    expect(body.notification_url).toBe('https://synthetic.example/api/paymob/webhook');
    expect(new URL(gateway.checkoutUrl(result.clientSecret)).origin).toBe(PAYMOB_SA_ORIGIN);
  });
  it('does not contact Paymob with missing keys, invalid amounts or invalid phones', async () => {
    const fetcher = vi.fn();
    const input = { reference: 'test', amountMinor: 4900, itemName: 'Test', phone: '+966500000000', firstName: 'Synthetic', lastName: 'Customer', notificationUrl: 'https://synthetic.example/hook', returnUrl: 'https://synthetic.example/return' };
    await expect(new PaymobGateway({ ...config, apiKey: undefined }, fetcher).createIntention(input)).rejects.toThrow();
    for (const amountMinor of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1]) await expect(new PaymobGateway(config, fetcher).createIntention({ ...input, amountMinor })).rejects.toThrow();
    await expect(new PaymobGateway(config, fetcher).createIntention({ ...input, phone: 'invalid' })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('can reconcile callbacks after new checkout has been disabled', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ token: 'synthetic-ephemeral-token' })))
      .mockResolvedValueOnce(new Response(JSON.stringify(transaction)));
    expect((await new PaymobGateway({ ...config, enabled: false }, fetcher).retrieveTransaction('2556706')).id).toBe(2556706);
    expect(fetcher.mock.calls[0][0]).toBe(PAYMOB_SA_ORIGIN + '/api/auth/tokens');
    expect(fetcher.mock.calls[1][1].redirect).toBe('error');
  });
});
