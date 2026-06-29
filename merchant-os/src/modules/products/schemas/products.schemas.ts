import { z } from 'zod';

// ============================================================================
// Product Schemas
// ============================================================================

/** Schema for creating a new product */
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  images: z.array(z.string().url()).optional().default([]),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

/** Schema for updating a product */
export const updateProductSchema = createProductSchema.partial();

/** Schema for filtering/listing products */
export const productFilterSchema = z.object({
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
