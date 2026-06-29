import { z } from 'zod';

// ============================================================================
// Category Schemas
// ============================================================================

/** Schema for creating a new category */
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  parentId: z.string().cuid().optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

/** Schema for updating a category */
export const updateCategorySchema = createCategorySchema.partial();

/** Schema for reordering categories */
export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().cuid(),
      sortOrder: z.number().int(),
    })
  ),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
