import { NotFoundError } from '@/lib/errors';
import * as inventoryRepo from '../repositories/inventory.repository';
import type { InventoryFilterInput } from '../schemas/inventory.schemas';
import type { StockMovementType } from '@prisma/client';

// ============================================================================
// Inventory Service — Business logic
// ============================================================================

/** Get paginated inventory list */
export async function getInventory(merchantId: string, filters?: InventoryFilterInput) {
  return inventoryRepo.findAll(merchantId, filters);
}

/** Get stock info for a specific product */
export async function getProductStock(merchantId: string, productId: string) {
  const item = await inventoryRepo.findByProduct(merchantId, productId);
  if (!item) throw new NotFoundError('Inventory item', productId);
  return item;
}

/** Adjust stock for a product with movement log */
export async function adjustStock(
  merchantId: string,
  productId: string,
  quantity: number,
  type: StockMovementType,
  reason: string,
  userId?: string
) {
  return inventoryRepo.adjustStock(merchantId, productId, quantity, type, reason, undefined, userId);
}

/** Get products below their low-stock threshold */
export async function getLowStockAlerts(merchantId: string) {
  return inventoryRepo.findLowStock(merchantId);
}

/** Get stock movement history for a product */
export async function getMovements(merchantId: string, productId: string, page = 1, limit = 20) {
  return inventoryRepo.getMovements(merchantId, productId, { page, limit });
}

/** Update low-stock threshold */
export async function updateThreshold(merchantId: string, productId: string, threshold: number) {
  return inventoryRepo.updateThreshold(merchantId, productId, threshold);
}
