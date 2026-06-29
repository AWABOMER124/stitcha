import type { InventoryItem, StockMovement, StockMovementType } from '@prisma/client';

// ============================================================================
// Inventory Module — Types
// ============================================================================

/** Inventory item with product info */
export interface InventoryItemWithProduct extends InventoryItem {
  product: {
    id: string;
    name: string;
    sku: string | null;
    images: unknown;
  };
}

/** Low stock alert item */
export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  lowStockThreshold: number;
}

export type { InventoryItem, StockMovement, StockMovementType };
