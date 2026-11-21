import { notFound } from 'next/navigation';
import * as service from '@/modules/storefront/services/storefront.service';
import { CheckoutClient, type Merchant } from './_client';
import { getPlatformBillingSettings } from '@/modules/subscription-payments/subscription-payments.service';
import { getMerchantOnlinePaymentStatus } from '@/modules/paymob-payments/market-payments.service';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await service.getMerchantBySlug(slug);
  if (!merchant) notFound();
  const [billing, gateway] = await Promise.all([
    getPlatformBillingSettings(),
    getMerchantOnlinePaymentStatus(merchant.id),
  ]);
  return <CheckoutClient merchant={merchant as unknown as Merchant} slug={slug} usdToSdgRate={billing.usdToSdgRate} onlinePaymentsEnabled={gateway.ready} onlineProvider={gateway.provider} />;
}
