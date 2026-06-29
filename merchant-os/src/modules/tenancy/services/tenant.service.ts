import prisma from '@/lib/db/prisma';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

/**
 * Tenant service — resolves and validates tenant access.
 */

/** Resolve a tenant by slug */
export async function resolveTenantBySlug(slug: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, status: true, isActive: true },
  });
  if (!merchant) throw new NotFoundError('Merchant', `Merchant "${slug}" not found`);
  return merchant;
}

/** Resolve a tenant by ID */
export async function resolveTenantById(id: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, status: true, isActive: true },
  });
  if (!merchant) throw new NotFoundError('Merchant');
  return merchant;
}

/** Validate that a user has access to a specific merchant */
export async function validateTenantAccess(userId: string, merchantId: string) {
  const merchantUser = await prisma.merchantUser.findUnique({
    where: { userId_merchantId: { userId, merchantId } },
    include: { merchant: { select: { id: true, name: true, slug: true } } },
  });

  if (!merchantUser || !merchantUser.isActive) {
    throw new ForbiddenError('You do not have access to this merchant');
  }

  return merchantUser;
}
