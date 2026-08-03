import prisma from '@/lib/db/prisma';
import type { InventoryItem, StockMovementType, Prisma } from '@prisma/client';
import type { InventoryFilterInput } from '../schemas/inventory.schemas';
import { serializePrismaObject } from '@/lib/serialization';

// ============================================================================
// Inventory Repository — Data access layer
// ============================================================================

/** Find inventory item for a specific product */
export async function findByProduct(merchantId: string, productId: string): Promise<InventoryItem | null> {
  const item = await prisma.inventoryItem.findFirst({
    where: { merchantId, productId },
    include: { product: true },
  });
  return serializePrismaObject(item);
}

/** Find all inventory items with optional filters */
export async function findAll(merchantId: string, filters?: InventoryFilterInput) {
  const { page = 1, limit = 20, lowStockOnly, search, branchId } = filters ?? {};
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryItemWhereInput = {
    merchantId,
    ...(branchId && { branchId }),
    ...(lowStockOnly && {
      quantity: { lte: prisma.inventoryItem.fields.lowStockThreshold } as unknown as number,
    }),
    ...(search && {
      product: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ],
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      include: { product: { select: { id: true, name: true, sku: true, images: true } } },
      orderBy: { quantity: 'asc' },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Find items below their low stock threshold */
export async function findLowStock(merchantId: string) {
  return prisma.$queryRaw<InventoryItem[]>`
    SELECT ii.*, p.name as "productName", p.sku as "productSku"
    FROM inventory_items ii
    JOIN products p ON p.id = ii."productId"
    WHERE ii."merchantId" = ${merchantId}
      AND ii.quantity <= ii."lowStockThreshold"
      AND ii."trackInventory" = true
    ORDER BY ii.quantity ASC
  `;
}

/** Adjust stock quantity and create a movement log */
export async function adjustStock(
  merchantId: string,
  productId: string,
  quantity: number,
  type: StockMovementType,
  reason?: string,
  reference?: string,
  userId?: string
): Promise<InventoryItem> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { merchantId, productId },
    });

    if (!item) throw new Error(`Inventory item not found for product ${productId}`);

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    // Update inventory
    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
    });

    // Create movement log
    await tx.stockMovement.create({
      data: {
        inventoryItemId: item.id,
        type,
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        reference,
        createdById: userId,
      },
    });

    return updated;
  });
}

/**
 * Adjust stock for several products in a single transaction (one DB round-trip
 * instead of one transaction per line item — see orders.service.ts callers).
 * Products with no InventoryItem row, or with trackInventory=false, are
 * silently skipped: inventory tracking is opt-in per product, and an order
 * for an untracked product isn't an error.
 */
export async function batchAdjustStock(
  merchantId: string,
  adjustments: { productId: string; delta: number }[],
  type: StockMovementType,
  reason: string,
  reference?: string,
): Promise<InventoryItem[]> {
  if (adjustments.length === 0) return [];

  return prisma.$transaction(async (tx) => {
    const items = await tx.inventoryItem.findMany({
      where: {
        merchantId,
        trackInventory: true,
        productId: { in: adjustments.map((a) => a.productId) },
      },
    });
    const itemByProduct = new Map(items.map((i) => [i.productId, i]));

    const updated: InventoryItem[] = [];
    for (const { productId, delta } of adjustments) {
      const item = itemByProduct.get(productId);
      if (!item) continue;

      const previousQuantity = item.quantity;
      const newQuantity = previousQuantity + delta;

      const result = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          type,
          quantity: delta,
          previousQuantity,
          newQuantity,
          reason,
          reference,
        },
      });

      updated.push(result);
    }
    return updated;
  });
}

/** Update low-stock threshold for a product */
export async function updateThreshold(merchantId: string, productId: string, threshold: number) {
  return prisma.inventoryItem.updateMany({
    where: { merchantId, productId },
    data: { lowStockThreshold: threshold },
  });
}

/** Get stock movement history for a product */
export async function getMovements(merchantId: string, productId: string, pagination: { page: number; limit: number }) {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;

  const item = await prisma.inventoryItem.findFirst({
    where: { merchantId, productId },
  });

  if (!item) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { inventoryItemId: item.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockMovement.count({ where: { inventoryItemId: item.id } }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
