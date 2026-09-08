import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { getStoreProduct } from '@/modules/storefront/services/storefront.service';
import { ServiceBookingClient } from './service-booking-client';

export default async function ServiceBookingPage({ params }: { params: Promise<{ slug: string; productSlug: string }> }) {
  const { slug, productSlug } = await params;
  const product = await getStoreProduct(slug, productSlug).catch(() => null);
  if (!product || product.itemType !== 'SERVICE' || !product.serviceProfile) notFound();
  const branches = await prisma.branch.findMany({ where: { merchantId: product.merchantId, isActive: true }, select: { id: true, name: true, address: true }, orderBy: [{ isMain: 'desc' }, { name: 'asc' }] });
  return <ServiceBookingClient slug={slug} product={{ name: product.name, slug: product.slug, description: product.description, images: product.images as string[], price: Number(product.price), serviceProfile: product.serviceProfile }} branches={branches} />;
}
