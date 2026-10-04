import prisma from '@/lib/db/prisma';

export interface SessionSecurityToken {
  id: string;
  role: string;
  authVersion?: number;
  merchantId?: string | null;
  distributorId?: string | null;
  deliveryPartnerId?: string | null;
}

/**
 * Revalidates the security-sensitive parts of a JWT session against the
 * database. This lets password resets, staff deactivation and tenant
 * suspension revoke an existing session without waiting for JWT expiry.
 */
export async function isSessionSecurityStateValid(token: SessionSecurityToken): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { authVersion: true, role: true, platformAccessEnabled: true },
  });
  if (!user || user.authVersion !== (token.authVersion ?? 0)) return false;

  if (token.role.startsWith('PLATFORM_')) {
    return user.role.startsWith('PLATFORM_') && user.platformAccessEnabled;
  }

  if (token.merchantId) {
    const membership = await prisma.merchantUser.findFirst({
      where: {
        userId: token.id,
        merchantId: token.merchantId,
        isActive: true,
        merchant: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  if (token.deliveryPartnerId) {
    const membership = await prisma.deliveryPartnerUser.findFirst({
      where: {
        userId: token.id,
        partnerId: token.deliveryPartnerId,
        isActive: true,
        partner: { isActive: true, status: { not: 'SUSPENDED' } },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  if (token.distributorId) {
    const membership = await prisma.distributorUser.findFirst({
      where: { userId: token.id, distributorId: token.distributorId, isActive: true },
      select: { id: true },
    });
    return Boolean(membership);
  }

  // Standalone roles such as MARKETER are still protected by authVersion.
  return true;
}
