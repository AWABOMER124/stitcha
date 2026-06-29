'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as rolesService from './services/roles.service';
import { createRoleSchema, updateRoleSchema, assignPermissionsSchema } from './schemas/roles.schemas';
import type { ActionResult } from '@/lib/types';
import type { Role } from '@prisma/client';

// ============================================================================
// Roles Module — Server Actions
// ============================================================================

/** List all roles for the current merchant */
export async function getRolesAction(): Promise<ActionResult<Role[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'roles:read');
    const roles = await rolesService.getRoles(auth.merchantId);
    return { success: true, data: roles as unknown as Role[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get roles' };
  }
}

/** Create a new role */
export async function createRoleAction(formData: unknown): Promise<ActionResult<Role>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'roles:create');
    const parsed = createRoleSchema.parse(formData);
    const role = await rolesService.createRole(auth.merchantId, parsed);
    return { success: true, data: role as unknown as Role };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create role' };
  }
}

/** Update a role */
export async function updateRoleAction(id: string, formData: unknown): Promise<ActionResult<Role>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'roles:update');
    const parsed = updateRoleSchema.parse(formData);
    const role = await rolesService.updateRole(id, parsed);
    return { success: true, data: role as unknown as Role };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update role' };
  }
}

/** Delete a role */
export async function deleteRoleAction(id: string): Promise<ActionResult<Role>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'roles:delete');
    const role = await rolesService.deleteRole(id);
    return { success: true, data: role };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete role' };
  }
}

/** Assign permissions to a role */
export async function assignPermissionsAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'roles:update');
    const parsed = assignPermissionsSchema.parse(formData);
    const result = await rolesService.assignPermissions(parsed.roleId, parsed.permissionIds);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign permissions' };
  }
}
