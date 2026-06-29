import { z } from 'zod';

// ============================================================================
// Branches Module — Validation Schemas
// ============================================================================

export const createBranchSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isMain: z.boolean().default(false),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
