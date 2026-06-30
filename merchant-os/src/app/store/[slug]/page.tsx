import { notFound } from 'next/navigation';
import * as service from '@/modules/storefront/services/storefront.service';
import { StoreClient } from './_client';

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await service.getMerchantBySlug(slug);
  if (!merchant) notFound();

  const [categories, products] = await Promise.all([
    service.getCategoriesForStore(merchant.id),
    service.getProductsForStore(merchant.id),
  ]);

  return <StoreClient merchant={merchant as any} categories={categories as any} products={products as any} />;
}
