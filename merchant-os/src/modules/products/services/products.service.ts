import prisma from '@/lib/db/prisma';
import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import * as productsRepo from '../repositories/products.repository';
import type { CreateProductInput, UpdateProductInput, ProductFilterInput } from '../schemas/products.schemas';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import type { Prisma } from '@prisma/client';

// ============================================================================
// Products Service — Business logic
// ============================================================================

/**
 * Generate a URL-safe slug from a product name, appending a counter for uniqueness.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get paginated list of products.
 */
export async function getProducts(merchantId: string, filters: ProductFilterInput) {
  return productsRepo.findAll(merchantId, filters);
}

/**
 * Get a single product with category and modifiers.
 * @throws NotFoundError if product doesn't exist
 */
export async function getProduct(merchantId: string, id: string) {
  const product = await productsRepo.findById(merchantId, id);
  if (!product) throw new NotFoundError('Product', id);
  return product;
}

/**
 * Create a new product and its initial inventory item.
 */
export async function createProduct(merchantId: string, data: CreateProductInput) {
  const slug = generateSlug(data.name);

  // Check if slug already exists and append random suffix if needed
  const existing = await productsRepo.findBySlug(merchantId, slug);
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  // Create product + inventory item atomically
  const product = await prisma.$transaction(async (tx) => {
    if (data.isActive ?? true) await assertActiveProductCapacity(tx, merchantId);
    const newProduct = await tx.product.create({
      data: {
        merchantId,
        name: data.name,
        slug: finalSlug,
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

    // Create associated inventory item
    await tx.inventoryItem.create({
      data: {
        productId: newProduct.id,
        merchantId,
        quantity: 0,
        lowStockThreshold: 5,
      },
    });

    return newProduct;
  });

  return product;
}

/**
 * Update an existing product.
 * @throws NotFoundError if product doesn't exist
 */
export async function updateProduct(merchantId: string, id: string, data: UpdateProductInput) {
  const current = await getProduct(merchantId, id); // ensure exists
  if (data.isActive === true && !current.isActive) {
    return prisma.$transaction(async tx => {
      await assertActiveProductCapacity(tx, merchantId);
      return tx.product.update({ where: { id, merchantId }, data, include: { category: true } });
    });
  }
  return productsRepo.update(merchantId, id, data);
}

/**
 * Delete (soft) a product. Checks for pending orders first.
 * @throws BusinessRuleError if product has pending orders
 */
export async function deleteProduct(merchantId: string, id: string) {
  await getProduct(merchantId, id);

  // Check for pending orders with this product
  const pendingOrderItems = await prisma.orderItem.count({
    where: {
      productId: id,
      order: {
        merchantId,
        status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
      },
    },
  });

  if (pendingOrderItems > 0) {
    throw new BusinessRuleError('Cannot delete product with pending orders');
  }

  return productsRepo.softDelete(merchantId, id);
}

/**
 * Toggle a product's active/inactive status.
 */
export async function toggleProductStatus(merchantId: string, id: string) {
  const product = await getProduct(merchantId, id);
  if (!product.isActive) {
    return prisma.$transaction(async tx => {
      await assertActiveProductCapacity(tx, merchantId);
      return tx.product.update({ where: { id, merchantId }, data: { isActive: true }, include: { category: true } });
    });
  }
  return productsRepo.update(merchantId, id, { isActive: !product.isActive });
}

async function assertActiveProductCapacity(tx: Prisma.TransactionClient, merchantId: string) {
  // Serialize capacity claims so simultaneous imports/AI actions cannot both
  // pass the FREE-plan limit.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'active-products:' + merchantId}))`;
  const plan = await getMerchantPlanSnapshot(merchantId, new Date(), tx);
  const limit = plan.entitlements.maxActiveProducts;
  if (limit === -1) return;
  const active = await tx.product.count({ where: { merchantId, isActive: true } });
  if (active >= limit) throw new BusinessRuleError(`بلغت الحد الأقصى للمنتجات النشطة (${limit}). رقِّ إلى باقة Pro لإضافة المزيد.`);
}
