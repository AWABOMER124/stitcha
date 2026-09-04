import { BusinessRuleError } from '@/lib/errors';
import type { BillingCheckoutRequest, BillingCheckoutResult, BillingProvider, VerifiedBillingEvent } from './billing-provider';

/** Existing Bankak/MyCashy transfers remain local and admin-reviewed. */
export class ManualBillingProvider implements BillingProvider {
  readonly key = 'manual';

  async createCheckout(input: BillingCheckoutRequest): Promise<BillingCheckoutResult> {
    return { provider: this.key, checkoutId: input.subscriptionId, redirectUrl: '/dashboard/subscription' };
  }

  async createSubscription(): Promise<{ externalSubscriptionId: string }> {
    throw new BusinessRuleError('Manual subscriptions are activated only after receipt review');
  }

  async cancelSubscription(): Promise<void> {
    throw new BusinessRuleError('Manual subscriptions are managed by Wasla operations');
  }

  async getSubscription(): Promise<VerifiedBillingEvent | null> {
    return null;
  }

  async verifyWebhook(): Promise<VerifiedBillingEvent> {
    throw new BusinessRuleError('The manual billing provider does not accept webhooks');
  }
}
