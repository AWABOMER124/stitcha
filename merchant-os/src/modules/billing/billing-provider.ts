export type BillingInterval = 'MONTHLY' | 'YEARLY' | 'CUSTOM';
export type ProviderSubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface BillingCheckoutRequest {
  subscriptionId: string;
  amount: number;
  currency: string;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingCheckoutResult {
  provider: string;
  checkoutId: string;
  redirectUrl: string;
}

export interface VerifiedBillingEvent {
  id: string;
  type: string;
  externalSubscriptionId: string;
  status: ProviderSubscriptionStatus;
  externalCustomerId?: string;
  currentPeriodStartsAt?: Date;
  currentPeriodEndsAt?: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
}

export interface BillingProvider {
  readonly key: string;
  createCheckout(input: BillingCheckoutRequest): Promise<BillingCheckoutResult>;
  createSubscription(input: BillingCheckoutRequest): Promise<{ externalSubscriptionId: string }>;
  cancelSubscription(externalSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  getSubscription(externalSubscriptionId: string): Promise<VerifiedBillingEvent | null>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedBillingEvent>;
}
