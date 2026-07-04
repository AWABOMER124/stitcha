import prisma from '@/lib/db/prisma';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

/**
 * Storefront repository — public-facing data access, no auth required.
 */

export async function getMerchantBySlug(slug: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { slug, isActive: true, status: 'ACTIVE' },
    select: {
      id: true, name: true, slug: true, description: true, logo: true,
      coverImage: true, phone: true, businessType: true,
      storefrontSettings: true,
    },
  });
  return serializePrismaObject(merchant);
}

export async function getCategories(merchantId: string) {
  return prisma.category.findMany({
    where: { merchantId, isActive: true },
    select: {
      id: true, name: true, slug: true, description: true, image: true, sortOrder: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getProducts(merchantId: string, categoryId?: string, search?: string) {
  const products = await prisma.product.findMany({
    where: {
      merchantId,
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: {
      id: true, name: true, slug: true, description: true, images: true,
      price: true, compareAtPrice: true, isFeatured: true, categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
      modifiers: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, required: true, minSelections: true, maxSelections: true, options: true },
      },
    },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
  return serializePrismaArray(products);
}

export async function getProduct(merchantId: string, productSlug: string) {
  const product = await prisma.product.findFirst({
    where: { merchantId, slug: productSlug, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  return serializePrismaObject(product);
}

export async function getStorefrontSettings(merchantId: string) {
  const settings = await prisma.storefrontSettings.findUnique({ where: { merchantId } });
  return serializePrismaObject(settings);
}
