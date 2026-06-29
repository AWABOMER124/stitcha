import { z } from 'zod';

// ============================================================================
// Merchant Schemas
// ============================================================================

/** Schema for creating a new merchant */
export const createMerchantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(), // Auto-generated from name if omitted
  description: z.string().max(500).optional(),
  businessType: z.enum(['RESTAURANT', 'CAFE', 'GROCERY', 'PHARMACY', 'RETAIL', 'OTHER']),
  phone: z.string().min(9, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address is required'),
  logo: z.string().url().optional(),
  coverImage: z.string().url().optional(),
});

/** Schema for updating an existing merchant */
export const updateMerchantSchema = createMerchantSchema.partial();

/** Schema for merchant settings (currency, timezone, etc.) */
export const merchantSettingsSchema = z.object({
  currency: z.string().length(3, 'Currency code must be 3 characters').default('SDG'),
  timezone: z.string().default('Africa/Khartoum'),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
export type MerchantSettingsInput = z.infer<typeof merchantSettingsSchema>;
