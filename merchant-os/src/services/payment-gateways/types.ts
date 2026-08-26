export type CheckoutMode = 'payment' | 'subscription';

export interface CheckoutSessionInput {
  mode: CheckoutMode;
  internalReference: string;
  idempotencyKey: string;
  itemName: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  provider: 'STRIPE';
  sessionId: string;
  checkoutUrl: string;
}

export interface PaymentGatewayStatus {
  provider: 'STRIPE';
  enabled: boolean;
  configured: boolean;
}

export interface PaymentGateway {
  status(): PaymentGatewayStatus;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  constructWebhookEvent(rawBody: string, signature: string | null, now?: Date): StripeWebhookEvent;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, unknown> };
}
