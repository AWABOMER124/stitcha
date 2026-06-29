import { z } from 'zod';

// ============================================================================
// Inventory Schemas
// ============================================================================

/** Schema for adjusting stock */
export const adjustStockSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int('Quantity must be a whole number'),
  reason: z.string().min(2, 'Reason is required').max(200),
  type: z.enum(['ADJUSTMENT', 'SALE', 'RETURN', 'RESTOCK', 'DAMAGE', 'TRANSFER']),
  reference: z.string().optional(),
});

/** Schema for updating low-stock threshold */
export const updateThresholdSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  lowStockThreshold: z.number().int().min(0, 'Threshold cannot be negative'),
});

/** Schema for inventory filters */
export const inventoryFilterSchema = z.object({
  lowStockOnly: z.boolean().optional(),
  search: z.string().optional(),
  branchId: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateThresholdInput = z.infer<typeof updateThresholdSchema>;
export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>;
