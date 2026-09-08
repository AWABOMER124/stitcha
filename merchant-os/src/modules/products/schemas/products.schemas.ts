import { z } from 'zod';

// ============================================================================
// Product Schemas
// ============================================================================

/** Schema for creating a new product */
const productImageUrlSchema = z.string().max(2048).refine(
  (value) => value.startsWith('/uploads/') || /^https:\/\//i.test(value),
  'Product image must be a secure URL or a managed upload',
);

const productFieldsSchema = z.object({
  itemType: z.enum(['PRODUCT', 'SERVICE']).optional(),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().positive().optional(),
  images: z.array(productImageUrlSchema).max(10).optional().default([]),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  serviceProfile: z.object({
    durationMinutes: z.number().int().min(5).max(1_440).default(60),
    bufferMinutes: z.number().int().min(0).max(480).default(0),
    bookingRequired: z.boolean().default(true),
    fulfillmentType: z.enum(['AT_BRANCH', 'AT_CUSTOMER_LOCATION', 'ONLINE', 'REQUEST_ONLY']).default('AT_BRANCH'),
    minimumNoticeMinutes: z.number().int().min(0).max(43_200).default(120),
    maxParticipants: z.number().int().min(1).max(100).default(1),
    advancePaymentPercent: z.number().int().min(0).max(100).default(0),
    cancellationPolicy: z.string().max(2_000).optional(),
  }).optional(),
});

export const createProductSchema = productFieldsSchema.superRefine((data, ctx) => {
  if (data.itemType === 'SERVICE' && !data.serviceProfile) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProfile'], message: 'Service settings are required for services' });
  }
});

/** Schema for updating a product */
// Keep the update schema based on the unrefined object. Zod intentionally
// disallows `.partial()` on schemas with refinements at module evaluation time.
export const updateProductSchema = productFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.itemType === 'SERVICE' && data.serviceProfile === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['serviceProfile'], message: 'Service settings cannot be removed' });
  }
});

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
