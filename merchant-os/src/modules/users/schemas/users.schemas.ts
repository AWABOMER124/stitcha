import { z } from 'zod';

// ============================================================================
// Users Module — Validation Schemas
// ============================================================================

const userRoleEnum = z.enum([
  'PLATFORM_OWNER',
  'DISTRIBUTOR_OWNER',
  'DISTRIBUTOR_ADMIN',
  'MERCHANT_OWNER',
  'MERCHANT_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'DELIVERY_STAFF',
  'CUSTOMER_SERVICE',
  'FINANCE_AGENT',
]);

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: userRoleEnum,
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).optional(),
  });

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: userRoleEnum,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
