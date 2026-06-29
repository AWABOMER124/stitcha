import { z } from 'zod';

// ============================================================================
// Roles Module — Validation Schemas
// ============================================================================

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const assignPermissionsSchema = z.object({
  roleId: z.string().min(1),
  permissionIds: z.array(z.string()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
