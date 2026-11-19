/** Confirmed Saudi carrier policy. Pure calculation; does not activate any market or charge a customer. */
export const SA_SHIPPING_POLICY_VERSION = 'sa-pearl-star-20261119-v1';
export type SaudiPaymentMode = 'PREPAID' | 'COD';
const MAX_GOODS_MINOR = 9_999_999_999;
export function calculateSaudiMerchantShipping(goodsMinor: number, paymentMode: SaudiPaymentMode) {
  if (!Number.isSafeInteger(goodsMinor) || goodsMinor < 0 || goodsMinor > MAX_GOODS_MINOR) throw new RangeError('Invalid goods amount in SAR minor units');
  if (paymentMode !== 'PREPAID' && paymentMode !== 'COD') throw new TypeError('Unsupported payment mode');
  const shippingMinor = 2_000;
  const codFeeMinor = paymentMode === 'COD' ? Math.floor((goodsMinor * 200 + 5_000) / 10_000) : 0;
  return { currency: 'SAR' as const, policyVersion: SA_SHIPPING_POLICY_VERSION, goodsMinor, shippingMinor, codFeeMinor, merchantLogisticsMinor: shippingMinor + codFeeMinor, platformSalesCommissionMinor: 0, partnerMerchantCommissionMinor: 0, automaticCustomerChargeMinor: 0 };
}
