import type { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';

export const PLATFORM_PERMISSIONS = {
  DASHBOARD: 'platform:dashboard',
  MERCHANTS_READ: 'platform:merchants:read',
  MERCHANTS_MANAGE: 'platform:merchants:manage',
  FINANCE_READ: 'platform:finance:read',
  PAYMENTS_REVIEW: 'platform:payments:review',
  SUBSCRIPTIONS_MANAGE: 'platform:subscriptions:manage',
  DELIVERY_MANAGE: 'platform:delivery:manage',
  USERS_MANAGE: 'platform:users:manage',
  SETTINGS_MANAGE: 'platform:settings:manage',
  NOTIFICATIONS_READ: 'platform:notifications:read',
} as const;

export type PlatformPermission = typeof PLATFORM_PERMISSIONS[keyof typeof PLATFORM_PERMISSIONS];

const ALL = Object.values(PLATFORM_PERMISSIONS);

export const PLATFORM_ROLE_PERMISSIONS: Partial<Record<UserRole, readonly PlatformPermission[]>> = {
  PLATFORM_OWNER: ALL,
  PLATFORM_ADMIN: ALL.filter((permission) => permission !== PLATFORM_PERMISSIONS.USERS_MANAGE),
  PLATFORM_OPERATIONS: [
    PLATFORM_PERMISSIONS.DASHBOARD,
    PLATFORM_PERMISSIONS.MERCHANTS_READ,
    PLATFORM_PERMISSIONS.MERCHANTS_MANAGE,
    PLATFORM_PERMISSIONS.DELIVERY_MANAGE,
    PLATFORM_PERMISSIONS.NOTIFICATIONS_READ,
  ],
  PLATFORM_FINANCE: [
    PLATFORM_PERMISSIONS.DASHBOARD,
    PLATFORM_PERMISSIONS.MERCHANTS_READ,
    PLATFORM_PERMISSIONS.FINANCE_READ,
    PLATFORM_PERMISSIONS.PAYMENTS_REVIEW,
    PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE,
    PLATFORM_PERMISSIONS.NOTIFICATIONS_READ,
  ],
  PLATFORM_SUPPORT: [
    PLATFORM_PERMISSIONS.DASHBOARD,
    PLATFORM_PERMISSIONS.MERCHANTS_READ,
    PLATFORM_PERMISSIONS.NOTIFICATIONS_READ,
  ],
};

export function isPlatformRole(role: UserRole | string): boolean {
  return role.startsWith('PLATFORM_');
}

export function hasPlatformPermission(role: UserRole, permission: PlatformPermission): boolean {
  return PLATFORM_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requirePlatformPermission(permission: PlatformPermission) {
  const { auth } = await import('@/lib/auth/config');
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError('You must be logged in');
  if (!hasPlatformPermission(session.user.role, permission)) throw new ForbiddenError('You do not have access to this platform operation');
  return session.user;
}
