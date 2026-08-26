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

function isStripeWebhookEvent(value: unknown): value is StripeWebhookEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  const data = event.data as Record<string, unknown> | undefined;
  return typeof event.id === 'string' && typeof event.type === 'string' && Boolean(data?.object && typeof data.object === 'object');
}
