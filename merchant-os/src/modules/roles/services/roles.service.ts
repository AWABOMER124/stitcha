import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import * as rolesRepo from '../repositories/roles.repository';
import type { CreateRoleInput, UpdateRoleInput } from '../schemas/roles.schemas';

// ============================================================================
// Roles Service — Business logic
// ============================================================================

/** Get all roles for a merchant (system + merchant-scoped) */
export async function getRoles(merchantId: string) {
  return rolesRepo.findAll(merchantId);
}

/** Create a new merchant-scoped role */
export async function createRole(merchantId: string, data: CreateRoleInput) {
  return rolesRepo.create(merchantId, data);
}

/** Update a role */
export async function updateRole(id: string, data: UpdateRoleInput) {
  const role = await rolesRepo.findById(id);
  if (!role) throw new NotFoundError('Role', id);
  return rolesRepo.update(id, data);
}

/** Delete a role — system roles cannot be deleted */
export async function deleteRole(id: string) {
  const role = await rolesRepo.findById(id);
  if (!role) throw new NotFoundError('Role', id);
  if (role.isSystem) {
    throw new BusinessRuleError('System roles cannot be deleted');
  }
  return rolesRepo.remove(id);
}

/** Assign permissions to a role */
export async function assignPermissions(roleId: string, permissionIds: string[]) {
  const role = await rolesRepo.findById(roleId);
  if (!role) throw new NotFoundError('Role', roleId);
  return rolesRepo.assignPermissions(roleId, permissionIds);
}
