import prisma from '@/lib/db/prisma';

/**
 * Storefront repository — public-facing data access, no auth required.
 */

export async function getMerchantBySlug(slug: string) {
  return prisma.merchant.findUnique({
    where: { slug, isActive: true, status: 'ACTIVE' },
    select: {
      id: true, name: true, slug: true, description: true, logo: true,
      coverImage: true, phone: true, businessType: true,
      storefrontSettings: true,
    },
  });
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
  return prisma.product.findMany({
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
      price: true, compareAtPrice: true, isFeatured: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getProduct(merchantId: string, productSlug: string) {
  return prisma.product.findFirst({
    where: { merchantId, slug: productSlug, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

export async function getStorefrontSettings(merchantId: string) {
  return prisma.storefrontSettings.findUnique({ where: { merchantId } });
}
