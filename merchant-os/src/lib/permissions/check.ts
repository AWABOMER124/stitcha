/**
 * @module permissions/check
 * @description Runtime permission checking utilities.
 */

import type { UserRole } from '@prisma/client';
import { ForbiddenError } from '@/lib/errors';
import { ROLE_PERMISSIONS } from './constants';

/**
 * Checks whether a role has a specific permission.
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Throws `ForbiddenError` when the role lacks the requested permission.
 */
export function requirePermission(userRole: UserRole, permission: string): void {
  if (!hasPermission(userRole, permission)) {
    throw new ForbiddenError(
      `Role "${userRole}" does not have permission "${permission}"`,
    );
  }
}

/**
 * Returns every permission granted to a role.
 */
export function getAllPermissions(userRole: UserRole): string[] {
  return [...(ROLE_PERMISSIONS[userRole] ?? [])];
}
