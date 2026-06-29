import { auth } from './config';
import { UnauthorizedError, TenantError } from '@/lib/errors';
import type { UserRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  merchantId?: string | null;
  merchantSlug?: string | null;
  distributorId?: string | null;
  distributorSlug?: string | null;
}

export interface MerchantContext {
  merchantId: string;
  merchantSlug: string;
}

export interface DistributorContext {
  distributorId: string;
  distributorSlug: string;
}

export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in');
  }
  return session.user as SessionUser;
}

export async function getCurrentMerchant(): Promise<MerchantContext> {
  const user = await getCurrentUser();
  if (!user.merchantId || !user.merchantSlug) {
    throw new TenantError('No merchant context found in session');
  }
  return {
    merchantId: user.merchantId,
    merchantSlug: user.merchantSlug,
  };
}

export async function getCurrentDistributor(): Promise<DistributorContext> {
  const user = await getCurrentUser();
  if (!user.distributorId || !user.distributorSlug) {
    throw new TenantError('No distributor context found in session');
  }
  return {
    distributorId: user.distributorId,
    distributorSlug: user.distributorSlug,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  return getCurrentUser();
}

export async function requireMerchant(): Promise<MerchantContext> {
  return getCurrentMerchant();
}

export async function requireDistributor(): Promise<DistributorContext> {
  return getCurrentDistributor();
}

export function isDistributorRole(role: UserRole): boolean {
  return role === 'DISTRIBUTOR_OWNER' || role === 'DISTRIBUTOR_ADMIN';
}

export function isMerchantRole(role: UserRole): boolean {
  return !isDistributorRole(role) && role !== 'PLATFORM_OWNER';
}
