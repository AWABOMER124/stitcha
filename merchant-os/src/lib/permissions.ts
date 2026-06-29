import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { auth } from '@/lib/auth/config';

/**
 * Permission string format: "module:action"
 * e.g. "products:create", "orders:read", "inventory:update"
 */
export type PermissionString = `${string}:${string}`;

export interface AuthContext {
  userId: string;
  merchantId: string;
  role: string;
  permissions: string[];
}

/**
 * Check if the auth context has a specific permission.
 * Throws ForbiddenError if not.
 */
export function requirePermission(auth: AuthContext, permission: PermissionString): void {
  if (!auth.permissions.includes(permission) && auth.role !== 'PLATFORM_OWNER' && auth.role !== 'MERCHANT_OWNER') {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}

/**
 * Check if the auth context has ANY of the listed permissions.
 */
export function requireAnyPermission(auth: AuthContext, permissions: PermissionString[]): void {
  if (auth.role === 'PLATFORM_OWNER' || auth.role === 'MERCHANT_OWNER') return;

  const hasAny = permissions.some((p) => auth.permissions.includes(p));
  if (!hasAny) {
    throw new ForbiddenError(`Missing one of required permissions: ${permissions.join(', ')}`);
  }
}

/**
 * Returns the auth context from the current NextAuth v5 session.
 * Permissions array is empty for role-based bypass (MERCHANT_OWNER / PLATFORM_OWNER skip per-permission checks).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError('You must be logged in');
  const merchantId = (session.user as { merchantId?: string | null }).merchantId;
  if (!merchantId) throw new UnauthorizedError('No merchant linked to this account');
  return {
    userId: session.user.id,
    merchantId,
    role: (session.user as { role?: string }).role ?? 'CASHIER',
    permissions: [],
  };
}
