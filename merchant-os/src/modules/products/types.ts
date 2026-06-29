import type { Product, Category } from '@prisma/client';

// ============================================================================
// Products Module — Types
// ============================================================================

/** Product with its related category */
export interface ProductWithCategory extends Product {
  category: Category;
}

/** Product with all relations loaded */
export interface ProductFull extends Product {
  category: Category;
  modifiers: {
    id: string;
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: unknown;
    sortOrder: number;
    isActive: boolean;
  }[];
  inventoryItem?: {
    quantity: number;
    lowStockThreshold: number;
  } | null;
}

export type { Product, Category };
