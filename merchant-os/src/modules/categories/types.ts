import type { Category } from '@prisma/client';

// ============================================================================
// Categories Module — Types
// ============================================================================

/** Category with product count */
export interface CategoryWithCount extends Category {
  _count: { products: number };
}

/** Category with hierarchy */
export interface CategoryWithChildren extends Category {
  children: Category[];
  parent: Category | null;
  _count: { products: number };
}

export type { Category };
