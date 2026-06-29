'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as inventoryService from './services/inventory.service';
import { adjustStockSchema, updateThresholdSchema, inventoryFilterSchema } from './schemas/inventory.schemas';
import type { ActionResult } from '@/lib/types';
import type { InventoryItem } from '@prisma/client';

// ============================================================================
// Inventory Module — Server Actions
// ============================================================================

/** Get inventory list */
export async function getInventoryAction(filters: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'inventory:read');
    const parsed = inventoryFilterSchema.parse(filters);
    const result = await inventoryService.getInventory(auth.merchantId, parsed);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get inventory' };
  }
}

/** Get stock for a specific product */
export async function getProductStockAction(productId: string): Promise<ActionResult<InventoryItem>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'inventory:read');
    const item = await inventoryService.getProductStock(auth.merchantId, productId);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get product stock' };
  }
}

/** Adjust stock for a product */
export async function adjustStockAction(formData: unknown): Promise<ActionResult<InventoryItem>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'inventory:update');
    const parsed = adjustStockSchema.parse(formData);
    const result = await inventoryService.adjustStock(
      auth.merchantId,
      parsed.productId,
      parsed.quantity,
      parsed.type,
      parsed.reason,
      auth.userId
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to adjust stock' };
  }
}

/** Update low-stock threshold */
export async function updateThresholdAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'inventory:update');
    const parsed = updateThresholdSchema.parse(formData);
    const result = await inventoryService.updateThreshold(auth.merchantId, parsed.productId, parsed.lowStockThreshold);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update threshold' };
  }
}

/** Get low stock alerts */
export async function getLowStockAlertsAction(): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'inventory:read');
    const alerts = await inventoryService.getLowStockAlerts(auth.merchantId);
    return { success: true, data: alerts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get low stock alerts' };
  }
}
