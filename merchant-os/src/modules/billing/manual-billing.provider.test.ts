import { describe, expect, it } from 'vitest';
import { ManualBillingProvider } from './manual-billing.provider';

describe('manual billing provider', () => {
  it('routes merchants to the existing receipt workflow without creating an external subscription', async () => {
    const provider = new ManualBillingProvider();
    await expect(provider.createCheckout({
      subscriptionId: 'subscription_1', amount: 25_000, currency: 'SDG', interval: 'MONTHLY',
      successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel',
    })).resolves.toEqual({ provider: 'manual', checkoutId: 'subscription_1', redirectUrl: '/dashboard/subscription' });
    await expect(provider.createSubscription()).rejects.toThrow('receipt review');
    await expect(provider.verifyWebhook()).rejects.toThrow('does not accept webhooks');
  });
});
