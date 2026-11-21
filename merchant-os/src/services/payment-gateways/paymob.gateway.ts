import { createHmac, timingSafeEqual } from 'node:crypto';
import { BusinessRuleError, UnauthorizedError, ValidationError } from '@/lib/errors';

export const PAYMOB_SA_ORIGIN = 'https://ksa.paymob.com';
export const PAYMOB_TRANSACTION_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
  'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id',
  'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
] as const;

export interface PaymobConfig {
  enabled: boolean;
  mode: 'TEST' | 'LIVE';
  secretKey?: string;
  publicKey?: string;
  apiKey?: string;
  hmacSecret?: string;
  integrationIds: number[];
}

export interface PaymobIntentionInput {
  reference: string;
  amountMinor: number;
  itemName: string;
  phone: string;
  firstName: string;
  lastName: string;
  email?: string;
  notificationUrl: string;
  returnUrl: string;
}

export class PaymobGateway {
  constructor(private readonly config: PaymobConfig, private readonly fetcher: typeof fetch = fetch) {}

  status() {
    const configured = Boolean(this.config.secretKey && this.config.publicKey && this.config.apiKey
      && this.config.hmacSecret && this.config.integrationIds.length > 0);
    return { provider: 'PAYMOB' as const, enabled: this.config.enabled, configured, mode: this.config.mode };
  }

  async createIntention(input: PaymobIntentionInput) {
    this.requireReady();
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new ValidationError('Invalid SAR payment amount');
    if (!/^\+?[1-9]\d{7,14}$/.test(input.phone)) throw new ValidationError('أكمل رقم هاتف صحيحًا قبل الدفع.');
    const response = await this.fetcher(`${PAYMOB_SA_ORIGIN}/v1/intention/`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Token ${this.config.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: input.amountMinor, currency: 'SAR', payment_methods: this.config.integrationIds,
        items: [{ name: input.itemName.slice(0, 200), amount: input.amountMinor, quantity: 1 }],
        billing_data: { first_name: input.firstName, last_name: input.lastName, phone_number: input.phone, ...(input.email ? { email: input.email } : {}), country: 'SAU' },
        special_reference: input.reference, notification_url: input.notificationUrl, redirection_url: input.returnUrl, expiration: 3600,
      }),
    });
    if (!response.ok) throw new BusinessRuleError(`Paymob رفض بدء الدفع (${response.status}).`);
    const body = await response.json() as Record<string, unknown>;
    const id = identifier(body.id), orderId = identifier(body.intention_order_id);
    if (!id || !orderId || typeof body.client_secret !== 'string' || !body.client_secret || body.client_secret.length > 2048) {
      throw new BusinessRuleError('Paymob returned an incomplete intention');
    }
    return { id, orderId, clientSecret: body.client_secret };
  }

  checkoutUrl(clientSecret: string) {
    this.requireReady();
    const url = new URL('/unifiedcheckout/', PAYMOB_SA_ORIGIN);
    url.searchParams.set('publicKey', this.config.publicKey!);
    url.searchParams.set('clientSecret', clientSecret);
    return url.toString();
  }

  verifyCallback(rawBody: string, signature: string | null) {
    if (!this.config.hmacSecret || !signature || !/^[a-f0-9]{128}$/i.test(signature)) throw new UnauthorizedError('Invalid Paymob signature');
    let body: { type?: unknown; obj?: unknown };
    try { body = JSON.parse(rawBody); } catch { throw new ValidationError('Invalid Paymob callback'); }
    if (body.type !== 'TRANSACTION' || !body.obj || typeof body.obj !== 'object' || Array.isArray(body.obj)) throw new ValidationError('Unsupported Paymob callback');
    const obj = body.obj as Record<string, unknown>;
    const message = paymobSignatureText(obj);
    const expected = createHmac('sha512', this.config.hmacSecret).update(message).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new UnauthorizedError('Invalid Paymob signature');
    const integrationId = Number(obj.integration_id);
    if (!this.config.integrationIds.includes(integrationId) || obj.currency !== 'SAR') throw new ValidationError('Unexpected Paymob integration or currency');
    return obj;
  }

  async retrieveTransaction(id: string): Promise<Record<string, unknown>> {
    if (!this.status().configured) throw new BusinessRuleError('Paymob transaction verification is unavailable');
    if (!/^\d{1,30}$/.test(id)) throw new ValidationError('Invalid Paymob transaction');
    try {
    const authentication = await this.fetcher(`${PAYMOB_SA_ORIGIN}/api/auth/tokens`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: this.config.apiKey }),
    });
    if (!authentication.ok) throw new BusinessRuleError('Paymob transaction verification is unavailable');
    const auth = await authentication.json() as { token?: unknown };
    if (typeof auth.token !== 'string' || !auth.token) throw new BusinessRuleError('Paymob transaction verification is unavailable');
    const url = new URL(`/api/acceptance/transactions/${id}`, PAYMOB_SA_ORIGIN);
    url.searchParams.set('token', auth.token);
    const response = await this.fetcher(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new BusinessRuleError('Paymob transaction verification is unavailable');
    return await response.json() as Record<string, unknown>;
    } catch {
      // Transport errors may contain the inquiry URL, which carries a token.
      throw new BusinessRuleError('Paymob transaction verification is unavailable');
    }
  }

  private requireReady() {
    const status = this.status();
    if (!status.enabled || !status.configured) throw new BusinessRuleError('الدفع عبر Paymob غير متاح حاليًا.');
  }
}

export function paymobSignatureText(obj: Record<string, unknown>): string {
  return PAYMOB_TRANSACTION_FIELDS.map(path => {
    let value: unknown = obj;
    for (const key of path.split('.')) value = value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
    // Unknown/null representations are rejected, not guessed. Add additional
    // callback shapes only after checking a signed provider fixture.
    if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) {
      throw new ValidationError('Incomplete Paymob signature fields');
    }
    return String(value);
  }).join('');
}

export function identifier(value: unknown): string | null {
  return (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,150}$/.test(value))
    || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) ? String(value) : null;
}

export function paymobPhone(value: string) {
  const phone = value.trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('00')) return '+' + phone.slice(2);
  if (phone.startsWith('966')) return '+' + phone;
  return '+966' + phone.replace(/^0/, '');
}
