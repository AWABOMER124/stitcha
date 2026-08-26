import { StripeGateway } from './stripe.gateway';

export function createStripeGatewayFromEnv() {
  return new StripeGateway({
    enabled: process.env.STRIPE_PAYMENTS_ENABLED === 'true',
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}

export { StripeGateway, toMinorUnits } from './stripe.gateway';
export type * from './types';
