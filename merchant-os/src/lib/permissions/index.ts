/**
 * @module permissions
 * @description Barrel export for the permission system.
 */

export { PERMISSIONS, ALL_PERMISSIONS, ROLE_PERMISSIONS } from './constants';
export { hasPermission, requirePermission, getAllPermissions } from './check';
export type { PermissionModule, PermissionAction, Permission } from './types';
