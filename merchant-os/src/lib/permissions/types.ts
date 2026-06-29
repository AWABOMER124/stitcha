/**
 * @module permissions/types
 * @description Type definitions for the permission system.
 */

import type { PERMISSIONS } from './constants';

/** Union of all module keys in the PERMISSIONS constant. */
export type PermissionModule = keyof typeof PERMISSIONS;

/** Union of all permission action keys within a given module. */
export type PermissionAction<M extends PermissionModule> = keyof (typeof PERMISSIONS)[M];

/** Flat union of every permission string value. */
export type Permission = (typeof PERMISSIONS)[PermissionModule][PermissionAction<PermissionModule>];
