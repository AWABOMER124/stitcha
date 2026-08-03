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

/** Update a role — must belong to the calling merchant (system roles are never mutable here) */
export async function updateRole(merchantId: string, id: string, data: UpdateRoleInput) {
  const role = await rolesRepo.findOwnedById(id, merchantId);
  if (!role) throw new NotFoundError('Role', id);
  return rolesRepo.update(id, merchantId, data);
}

/** Delete a role — must belong to the calling merchant; system roles cannot be deleted */
export async function deleteRole(merchantId: string, id: string) {
  const role = await rolesRepo.findOwnedById(id, merchantId);
  if (!role) throw new NotFoundError('Role', id);
  if (role.isSystem) {
    throw new BusinessRuleError('System roles cannot be deleted');
  }
  await rolesRepo.remove(id, merchantId);
  return role;
}

/** Assign permissions to a role — must belong to the calling merchant */
export async function assignPermissions(merchantId: string, roleId: string, permissionIds: string[]) {
  const role = await rolesRepo.findOwnedById(roleId, merchantId);
  if (!role) throw new NotFoundError('Role', roleId);
  return rolesRepo.assignPermissions(roleId, permissionIds);
}
