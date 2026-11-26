import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { paymentProviderForMarket } from '@/services/payment-gateways/market-policy';
import { createOrderStripeCheckout, createSubscriptionStripeCheckout, getStripeStatus, isMerchantEligibleForCentralStripe } from '@/modules/stripe-payments/stripe-payments.service';
import { getPaymobSettingsSummary } from './paymob-settings.service';
import { createPaymobOrderCheckout, createPaymobSubscriptionCheckout } from './paymob-payments.service';

export async function getMerchantPaymentGatewayStatus(merchantId: string) {
  const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId }, select: { subscriptionMarket: true, currency: true } });
  const provider = paymentProviderForMarket(merchant.subscriptionMarket);
  if (provider === 'STRIPE') return { ...getStripeStatus(), market: merchant.subscriptionMarket, currency: merchant.currency, mode: 'LIVE' as const };
  const status = await getPaymobSettingsSummary();
  return { provider, enabled: status.enabled && (process.env.NODE_ENV !== 'production' || status.mode === 'LIVE'), configured: status.configured,
    market: 'SA', currency: merchant.currency, mode: status.mode };
}

export async function getMerchantOnlinePaymentStatus(merchantId: string) {
  const [gateway, eligible] = await Promise.all([getMerchantPaymentGatewayStatus(merchantId), isMerchantEligibleForCentralStripe(merchantId)]);
  return { ...gateway, eligible, ready: gateway.enabled && gateway.configured && eligible && (gateway.provider !== 'PAYMOB' || gateway.currency === 'SAR') };
}

export async function createMarketOrderCheckout(input: { merchantId: string; orderId: string; origin: string; returnPath?: string }) {
  const status = await getMerchantOnlinePaymentStatus(input.merchantId);
  if (!status.ready) throw new BusinessRuleError('الدفع الإلكتروني غير متاح لهذا المتجر حاليًا.');
  return status.provider === 'PAYMOB' ? createPaymobOrderCheckout(input) : createOrderStripeCheckout(input);
}

export async function createMarketSubscriptionCheckout(input: { planChangeRequestId?: string; merchantId: string; customerEmail?: string | null; origin: string }) {
  const status = await getMerchantPaymentGatewayStatus(input.merchantId);
  return status.provider === 'PAYMOB' ? createPaymobSubscriptionCheckout(input) : createSubscriptionStripeCheckout(input);
}
