import { notFound } from 'next/navigation';
import * as service from '@/modules/storefront/services/storefront.service';
import { CartClient, type Merchant } from './_cart_client';

export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await service.getMerchantBySlug(slug);
  if (!merchant) notFound();

  return <CartClient merchant={merchant as unknown as Merchant} slug={slug} />;
}
