import { BusinessRuleError } from '@/lib/errors';
import { calculateSaudiMerchantShipping } from '@/modules/markets/sa/shipping-policy';
export function saudiShippingCharges(input: { subtotal: number; discount: number; cash: boolean }) {
  const goodsMinor = Math.round((input.subtotal - input.discount) * 100);
  if (!Number.isSafeInteger(goodsMinor) || goodsMinor < 0) throw new BusinessRuleError('قيمة البضاعة غير صالحة.');
  const result = calculateSaudiMerchantShipping(goodsMinor, input.cash ? 'COD' : 'PREPAID');
  return { shippingFee: result.shippingMinor / 100, collectionFee: result.codFeeMinor / 100,
    currency: result.currency, feePayer: 'MERCHANT', pricingPolicy: result.policyVersion } as const;
}
