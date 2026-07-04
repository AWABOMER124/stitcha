import prisma from '@/lib/db/prisma';
import type { Product, Prisma } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from '../schemas/products.schemas';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Products Repository — Data access layer
// ============================================================================

/**
 * Find a product by ID, scoped to a merchant.
 */
export async function findById(merchantId: string, id: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { id, merchantId },
    include: { category: true, modifiers: true },
  });
  return serializePrismaObject(product);
}

/**
 * Find a product by slug, scoped to a merchant.
 */
export async function findBySlug(merchantId: string, slug: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { merchantId, slug },
    include: { category: true, modifiers: true },
  });
  return serializePrismaObject(product);
}

/**
 * Find all products for a merchant with pagination and filters.
 */
export async function findAll(merchantId: string, filters: ProductFilterInput) {
  const { page = 1, limit = 20, search, categoryId, isActive, isFeatured, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    merchantId,
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: serializePrismaArray(data),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Find all products in a specific category.
 */
export async function findByCategory(merchantId: string, categoryId: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { merchantId, categoryId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return serializePrismaArray(products);
}

/**
 * Create a new product with auto-generated slug.
 */
export async function create(merchantId: string, data: CreateProductInput & { slug: string }): Promise<Product> {
  const product = await prisma.product.create({
    data: {
      merchantId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      categoryId: data.categoryId,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      images: data.images ?? [],
      sku: data.sku,
      barcode: data.barcode,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
    include: { category: true },
  });
  return serializePrismaObject(product);
}

/**
 * Update an existing product.
 */
export async function update(merchantId: string, id: string, data: UpdateProductInput): Promise<Product> {
  const product = await prisma.product.update({
    where: { id, merchantId },
    data,
    include: { category: true },
  });
  return serializePrismaObject(product);
}

/**
 * Soft-delete a product (set isActive = false).
 */
export async function softDelete(merchantId: string, id: string): Promise<Product> {
  const product = await prisma.product.update({
    where: { id, merchantId },
    data: { isActive: false },
  });
  return serializePrismaObject(product);
}

/**
 * Count products for a merchant with optional filters.
 */
export async function count(merchantId: string, filters?: Partial<ProductFilterInput>): Promise<number> {
  const where: Prisma.ProductWhereInput = {
    merchantId,
    ...(filters?.categoryId && { categoryId: filters.categoryId }),
    ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
  };
  return prisma.product.count({ where });
}
