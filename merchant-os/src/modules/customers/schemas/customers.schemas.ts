import { z } from 'zod';

// ============================================================================
// Customer Schemas
// ============================================================================

/** Schema for creating a customer */
export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(9, 'Phone number is required'),
  email: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

/** Schema for updating a customer */
export const updateCustomerSchema = createCustomerSchema.partial();

/** Schema for adding a customer address */
export const createAddressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  address: z.string().min(5, 'Address is required'),
  area: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional().default(false),
});

/** Schema for customer filters */
export const customerFilterSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CustomerFilterInput = z.infer<typeof customerFilterSchema>;
