import { createHmac, timingSafeEqual } from 'node:crypto';
import { BusinessRuleError, ValidationError } from '@/lib/errors';
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentGateway,
  PaymentGatewayStatus,
  StripeWebhookEvent,
} from './types';

const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_API_URL = 'https://api.stripe.com/v1';
const ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

export interface StripeGatewayConfig {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
}

interface StripeCheckoutResponse {
  id?: string;
  url?: string;
  error?: { type?: string };
}

export interface StripeConnectedAccount {
  id: string;
  country: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface StripeSubscriptionSnapshot {
  id: string;
  customerId?: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, string>;
}

export interface StripePaymentCost {
  chargeId: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
}

export class StripeGateway implements PaymentGateway {
  constructor(private readonly config: StripeGatewayConfig) {}

  status(): PaymentGatewayStatus {
    return { provider: 'STRIPE', enabled: this.config.enabled, configured: Boolean(this.config.secretKey && this.config.webhookSecret) };
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    this.requireReady();
    validateCheckoutInput(input);
    const body = new URLSearchParams();
    body.set('mode', input.mode);
    body.set('client_reference_id', input.internalReference);
    body.set('success_url', input.successUrl);
    body.set('cancel_url', input.cancelUrl);
    body.set('line_items[0][quantity]', '1');
    body.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
    body.set('line_items[0][price_data][unit_amount]', String(toMinorUnits(input.amount, input.currency)));
    body.set('line_items[0][price_data][product_data][name]', input.itemName);
    if (input.mode === 'subscription') body.set('line_items[0][price_data][recurring][interval]', 'month');
    if (input.customerEmail) body.set('customer_email', input.customerEmail);
    body.set('metadata[internal_reference]', input.internalReference);
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      if (key === 'internal_reference' || !/^[A-Za-z0-9_-]{1,40}$/.test(key) || value.length > 500) throw new ValidationError('Stripe metadata is invalid');
      body.set(`metadata[${key}]`, value);
      if (input.mode === 'subscription') body.set(`subscription_data[metadata][${key}]`, value);
      if (input.mode === 'payment') body.set(`payment_intent_data[metadata][${key}]`, value);
    }
    if (input.destinationAccountId) {
      if (!/^acct_[A-Za-z0-9]+$/.test(input.destinationAccountId)) throw new ValidationError('Stripe destination account is invalid');
      body.set('payment_intent_data[transfer_data][destination]', input.destinationAccountId);
      if (input.applicationFeeAmount !== undefined) {
        body.set('payment_intent_data[application_fee_amount]', String(toMinorUnits(input.applicationFeeAmount, input.currency)));
      }
    }

    const response = await fetch(STRIPE_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': input.idempotencyKey,
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as StripeCheckoutResponse;
    if (!response.ok || !payload.id || !payload.url) {
      console.error('[stripe] Checkout session creation failed', response.status, payload.error?.type ?? 'unknown');
      throw new BusinessRuleError('Stripe checkout is temporarily unavailable');
    }
    return { provider: 'STRIPE', sessionId: payload.id, checkoutUrl: payload.url };
  }

  async createConnectedAccount(input: { merchantId: string; country: string; email?: string }): Promise<StripeConnectedAccount> {
    this.requireReady();
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(input.merchantId)) throw new ValidationError('Merchant reference is invalid');
    if (!/^[A-Z]{2}$/.test(input.country)) throw new ValidationError('Stripe country must be an ISO country code');
    const body = new URLSearchParams({
      type: 'express',
      country: input.country,
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
      'metadata[merchant_id]': input.merchantId,
    });
    if (input.email) body.set('email', input.email);
    const payload = await this.requestStripe<Record<string, unknown>>('/accounts', body);
    return parseConnectedAccount(payload);
  }

  async createAccountLink(input: { accountId: string; refreshUrl: string; returnUrl: string }): Promise<string> {
    this.requireReady();
    validateStripeAccountId(input.accountId);
    validateHttpsUrl(input.refreshUrl);
    validateHttpsUrl(input.returnUrl);
    const payload = await this.requestStripe<Record<string, unknown>>('/account_links', new URLSearchParams({
      account: input.accountId,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: 'account_onboarding',
    }));
    if (typeof payload.url !== 'string' || !payload.url.startsWith('https://')) throw new BusinessRuleError('Stripe onboarding is temporarily unavailable');
    return payload.url;
  }

  async retrieveConnectedAccount(accountId: string): Promise<StripeConnectedAccount> {
    this.requireReady();
    validateStripeAccountId(accountId);
    return parseConnectedAccount(await this.requestStripe<Record<string, unknown>>(`/accounts/${encodeURIComponent(accountId)}`));
  }

  async retrieveSubscription(subscriptionId: string): Promise<StripeSubscriptionSnapshot> {
    this.requireReady();
    if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new ValidationError('Stripe subscription is invalid');
    const payload = await this.requestStripe<Record<string, unknown>>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    return parseSubscription(payload);
  }

  async retrievePaymentCost(paymentIntentId: string): Promise<StripePaymentCost> {
    this.requireReady();
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) throw new ValidationError('Stripe payment intent is invalid');
    const payload = await this.requestStripe<Record<string, unknown>>(`/payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=latest_charge.balance_transaction`);
    const charge = payload.latest_charge;
    if (!charge || typeof charge !== 'object' || Array.isArray(charge)) throw new BusinessRuleError('Stripe payment cost is not available yet');
    const balance = (charge as Record<string, unknown>).balance_transaction;
    if (!balance || typeof balance !== 'object' || Array.isArray(balance)) throw new BusinessRuleError('Stripe payment cost is not available yet');
    const amount = (balance as Record<string, unknown>).amount;
    const fee = (balance as Record<string, unknown>).fee;
    const net = (balance as Record<string, unknown>).net;
    const currency = (balance as Record<string, unknown>).currency;
    const chargeId = (charge as Record<string, unknown>).id;
    if (![amount, fee, net].every(value => typeof value === 'number') || typeof currency !== 'string' || typeof chargeId !== 'string') {
      throw new BusinessRuleError('Stripe returned invalid payment costs');
    }
    const divisor = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
    return { chargeId, amount: (amount as number) / divisor, fee: (fee as number) / divisor, net: (net as number) / divisor, currency: currency.toUpperCase() };
  }

  constructWebhookEvent(rawBody: string, signature: string | null, now = new Date()): StripeWebhookEvent {
    this.requireReady();
    if (!signature) throw new ValidationError('Missing Stripe signature');
    const parts = signature.split(',').map(part => part.trim().split('=', 2));
    const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
    const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean);
    if (!Number.isFinite(timestamp) || signatures.length === 0) throw new ValidationError('Invalid Stripe signature');
    if (Math.abs(now.getTime() / 1000 - timestamp) > 300) throw new ValidationError('Expired Stripe signature');
    const expected = createHmac('sha256', this.config.webhookSecret!).update(`${timestamp}.${rawBody}`).digest();
    const valid = signatures.some(value => {
      if (!/^[a-f0-9]{64}$/i.test(value)) return false;
      return timingSafeEqual(expected, Buffer.from(value, 'hex'));
    });
    if (!valid) throw new ValidationError('Invalid Stripe signature');
    let event: unknown;
    try { event = JSON.parse(rawBody); } catch { throw new ValidationError('Invalid Stripe webhook body'); }
    if (!isStripeWebhookEvent(event)) throw new ValidationError('Invalid Stripe webhook event');
    return event;
  }

  private requireReady() {
    if (!this.config.enabled) throw new BusinessRuleError('Stripe payments are not enabled');
    if (!this.config.secretKey || !this.config.webhookSecret) throw new BusinessRuleError('Stripe payments are not configured');
  }

  private async requestStripe<T>(path: string, body?: URLSearchParams): Promise<T> {
    const response = await fetch(`${STRIPE_API_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as T & { error?: { type?: string } };
    if (!response.ok) {
      console.error('[stripe] API request failed', path, response.status, payload.error?.type ?? 'unknown');
      throw new BusinessRuleError('Stripe is temporarily unavailable');
    }
    return payload;
  }
}

export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Payment amount must be positive');
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
  const minor = Math.round(amount * multiplier);
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new ValidationError('Payment amount is invalid');
  return minor;
}

function validateCheckoutInput(input: CheckoutSessionInput) {
  if (!input.internalReference.trim() || !input.idempotencyKey.trim()) throw new ValidationError('Payment reference is required');
  if (!input.itemName.trim() || input.itemName.length > 200) throw new ValidationError('Payment item name is invalid');
  if (!/^[A-Za-z]{3}$/.test(input.currency)) throw new ValidationError('Stripe currency must be a three-letter code');
  for (const url of [input.successUrl, input.cancelUrl]) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new ValidationError('Stripe return URL is invalid'); }
    if (!['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])].includes(parsed.protocol)) throw new ValidationError('Stripe return URL must use HTTPS');
  }
}

function validateStripeAccountId(value: string) {
  if (!/^acct_[A-Za-z0-9]+$/.test(value)) throw new ValidationError('Stripe account is invalid');
}

function validateHttpsUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError('Stripe return URL is invalid'); }
  if (!['https:', ...(process.env.NODE_ENV === 'production' ? [] : ['http:'])].includes(url.protocol)) throw new ValidationError('Stripe return URL must use HTTPS');
}

function parseConnectedAccount(payload: Record<string, unknown>): StripeConnectedAccount {
  if (typeof payload.id !== 'string' || !payload.id.startsWith('acct_')) throw new BusinessRuleError('Stripe returned an invalid account');
  return {
    id: payload.id,
    country: typeof payload.country === 'string' ? payload.country : '',
    detailsSubmitted: payload.details_submitted === true,
    chargesEnabled: payload.charges_enabled === true,
    payoutsEnabled: payload.payouts_enabled === true,
  };
}

function parseSubscription(payload: Record<string, unknown>): StripeSubscriptionSnapshot {
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata as Record<string, string> : {};
  if (typeof payload.id !== 'string' || !payload.id.startsWith('sub_') || typeof payload.status !== 'string') throw new BusinessRuleError('Stripe returned an invalid subscription');
  return {
    id: payload.id,
    customerId: typeof payload.customer === 'string' ? payload.customer : undefined,
    status: payload.status,
    currentPeriodStart: typeof payload.current_period_start === 'number' ? new Date(payload.current_period_start * 1000) : undefined,
    currentPeriodEnd: typeof payload.current_period_end === 'number' ? new Date(payload.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: payload.cancel_at_period_end === true,
    metadata,
  };
}

function isStripeWebhookEvent(value: unknown): value is StripeWebhookEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  const data = event.data as Record<string, unknown> | undefined;
  return typeof event.id === 'string' && typeof event.type === 'string' && Boolean(data?.object && typeof data.object === 'object');
}
