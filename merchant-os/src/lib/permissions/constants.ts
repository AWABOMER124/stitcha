/**
 * @module permissions/constants
 * @description Static permission strings and role-to-permission mappings for RBAC.
 */

import type { UserRole } from '@prisma/client';

/** Granular permission constants organised by module. */
export const PERMISSIONS = {
  PRODUCTS: {
    CREATE: 'products:create',
    READ: 'products:read',
    UPDATE: 'products:update',
    DELETE: 'products:delete',
  },
  CATEGORIES: {
    CREATE: 'categories:create',
    READ: 'categories:read',
    UPDATE: 'categories:update',
    DELETE: 'categories:delete',
  },
  ORDERS: {
    CREATE: 'orders:create',
    READ: 'orders:read',
    UPDATE: 'orders:update',
    DELETE: 'orders:delete',
    MANAGE_STATUS: 'orders:manage_status',
  },
  INVENTORY: {
    READ: 'inventory:read',
    UPDATE: 'inventory:update',
    ADJUST: 'inventory:adjust',
  },
  CUSTOMERS: {
    CREATE: 'customers:create',
    READ: 'customers:read',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete',
  },
  BRANCHES: {
    CREATE: 'branches:create',
    READ: 'branches:read',
    UPDATE: 'branches:update',
    DELETE: 'branches:delete',
  },
  STAFF: {
    CREATE: 'staff:create',
    READ: 'staff:read',
    UPDATE: 'staff:update',
    DELETE: 'staff:delete',
    MANAGE_ROLES: 'staff:manage_roles',
  },
  DELIVERY: {
    READ: 'delivery:read',
    UPDATE: 'delivery:update',
    ASSIGN: 'delivery:assign',
  },
  REPORTS: {
    VIEW: 'reports:view',
  },
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
  },
  NOTIFICATIONS: {
    READ: 'notifications:read',
    MANAGE: 'notifications:manage',
  },
} as const;

/** Flat array of every permission string in the system. */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS).flatMap((module) =>
  Object.values(module),
);

/** Maps each UserRole to the permissions it grants. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  PLATFORM_OWNER: ALL_PERMISSIONS,

  DISTRIBUTOR_OWNER: ALL_PERMISSIONS,

  DISTRIBUTOR_ADMIN: ALL_PERMISSIONS.filter(
    (p) => p !== PERMISSIONS.SETTINGS.UPDATE,
  ),

  MERCHANT_OWNER: ALL_PERMISSIONS,

  MERCHANT_ADMIN: ALL_PERMISSIONS.filter(
    (p) => p !== PERMISSIONS.STAFF.MANAGE_ROLES && p !== PERMISSIONS.SETTINGS.UPDATE,
  ),

  BRANCH_MANAGER: [
    PERMISSIONS.ORDERS.CREATE,
    PERMISSIONS.ORDERS.READ,
    PERMISSIONS.ORDERS.UPDATE,
    PERMISSIONS.ORDERS.MANAGE_STATUS,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.CATEGORIES.READ,
    PERMISSIONS.INVENTORY.READ,
    PERMISSIONS.INVENTORY.UPDATE,
    PERMISSIONS.INVENTORY.ADJUST,
    PERMISSIONS.CUSTOMERS.CREATE,
    PERMISSIONS.CUSTOMERS.READ,
    PERMISSIONS.CUSTOMERS.UPDATE,
    PERMISSIONS.DELIVERY.READ,
    PERMISSIONS.BRANCHES.READ,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.NOTIFICATIONS.READ,
  ],

  CASHIER: [
    PERMISSIONS.ORDERS.CREATE,
    PERMISSIONS.ORDERS.READ,
    PERMISSIONS.ORDERS.MANAGE_STATUS,
    PERMISSIONS.CUSTOMERS.CREATE,
    PERMISSIONS.CUSTOMERS.READ,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.CATEGORIES.READ,
    PERMISSIONS.NOTIFICATIONS.READ,
  ],

  INVENTORY_MANAGER: [
    PERMISSIONS.INVENTORY.READ,
    PERMISSIONS.INVENTORY.UPDATE,
    PERMISSIONS.INVENTORY.ADJUST,
    PERMISSIONS.PRODUCTS.READ,
    PERMISSIONS.CATEGORIES.READ,
    PERMISSIONS.NOTIFICATIONS.READ,
  ],

  DELIVERY_STAFF: [
    PERMISSIONS.DELIVERY.READ,
    PERMISSIONS.DELIVERY.UPDATE,
    PERMISSIONS.ORDERS.READ,
    PERMISSIONS.NOTIFICATIONS.READ,
  ],
} as const;
