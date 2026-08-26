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
      storePaymentAccounts: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: { id: true, channel: true, label: true, accountName: true, accountNumber: true, instructions: true },
      },
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

// Public, unauthenticated endpoint (storefront page + /api/stores/[id]/products +
// the external agent's read surface) — capped so a merchant with an unusually
// large catalog can't turn a single anonymous request into an unbounded query.
// No real storefront needs more than this on one page; raise it (or move to real
// cursor pagination) if a legitimate catalog ever gets close to the limit.
const MAX_STOREFRONT_PRODUCTS = 300;

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
    take: MAX_STOREFRONT_PRODUCTS,
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

const MERCHANT_LIST_SELECT = {
  id: true, name: true, slug: true, description: true, logo: true,
  coverImage: true, businessType: true,
} as const;

/**
 * Active merchants for the discovery feed, with currently-paid-featured
 * merchants (see FeaturedPlacement, sold by distributors — /distributor/finance/featured)
 * sorted first. `isFeatured` is exposed so the client can badge them visually.
 */
export async function listActiveMerchants() {
  const now = new Date();
  const merchants = await prisma.merchant.findMany({
    where: { isActive: true, status: 'ACTIVE' },
    select: {
      ...MERCHANT_LIST_SELECT,
      featuredPlacements: {
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const withFeaturedFlag = merchants.map(({ featuredPlacements, ...m }) => ({
    ...m,
    isFeatured: featuredPlacements.length > 0,
  }));
  withFeaturedFlag.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));

  return serializePrismaArray(withFeaturedFlag);
}

export async function getMerchantById(id: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id, isActive: true, status: 'ACTIVE' },
    select: { ...MERCHANT_LIST_SELECT, storefrontSettings: true },
  });
  return serializePrismaObject(merchant);
}
