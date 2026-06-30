import { notFound } from 'next/navigation';
import * as service from '@/modules/storefront/services/storefront.service';
import { CheckoutClient } from './_client';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await service.getMerchantBySlug(slug);
  if (!merchant) notFound();
  return <CheckoutClient merchant={merchant as any} slug={slug} />;
}
