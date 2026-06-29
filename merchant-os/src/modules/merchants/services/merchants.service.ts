import prisma from '@/lib/db/prisma';
import { NotFoundError, ConflictError } from '@/lib/errors';
import * as merchantsRepo from '../repositories/merchants.repository';
import type { CreateMerchantInput, UpdateMerchantInput } from '../schemas/merchants.schemas';
import type { MerchantStatus } from '@prisma/client';
import type { PaginationParams } from '@/lib/types';

// ============================================================================
// Merchants Service — Business logic orchestration
// ============================================================================

/**
 * Get a single merchant by ID.
 * @throws NotFoundError if merchant doesn't exist
 */
export async function getMerchant(id: string) {
  const merchant = await merchantsRepo.findById(id);
  if (!merchant) throw new NotFoundError('Merchant', id);
  return merchant;
}

/**
 * Get a single merchant by slug.
 * @throws NotFoundError if merchant doesn't exist
 */
export async function getMerchantBySlug(slug: string) {
  const merchant = await merchantsRepo.findBySlug(slug);
  if (!merchant) throw new NotFoundError('Merchant');
  return merchant;
}

/**
 * List all merchants with pagination.
 */
export async function listMerchants(params: PaginationParams) {
  return merchantsRepo.findAll(params);
}

/**
 * Generate a URL-safe slug from a name.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create a new merchant, along with the owner MerchantUser, the main Branch,
 * and initial StorefrontSettings.
 * @throws ConflictError if slug already taken
 */
export async function createMerchant(data: CreateMerchantInput, userId: string) {
  const slug = data.slug || generateSlug(data.name);

  // Check slug uniqueness
  const existing = await merchantsRepo.findBySlug(slug);
  if (existing) throw new ConflictError(`Merchant slug "${slug}" is already taken`);

  // Atomic transaction: merchant + owner link + main branch + storefront settings
  const merchant = await prisma.$transaction(async (tx) => {
    const newMerchant = await tx.merchant.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        businessType: data.businessType,
        phone: data.phone,
        email: data.email,
        address: data.address,
        logo: data.logo,
        coverImage: data.coverImage,
      },
    });

    // Create owner membership
    await tx.merchantUser.create({
      data: {
        userId,
        merchantId: newMerchant.id,
        role: 'MERCHANT_OWNER',
        isOwner: true,
      },
    });

    // Create main branch
    await tx.branch.create({
      data: {
        merchantId: newMerchant.id,
        name: 'Main Branch',
        address: data.address,
        phone: data.phone,
        isMain: true,
      },
    });

    // Create default storefront settings
    await tx.storefrontSettings.create({
      data: {
        merchantId: newMerchant.id,
      },
    });

    return newMerchant;
  });

  return merchant;
}

/**
 * Update merchant profile info.
 * @throws NotFoundError if merchant doesn't exist
 */
export async function updateMerchant(merchantId: string, data: UpdateMerchantInput) {
  await getMerchant(merchantId); // ensure exists
  return merchantsRepo.update(merchantId, data);
}

/**
 * Update merchant lifecycle status.
 * @throws NotFoundError if merchant doesn't exist
 */
export async function updateMerchantStatus(merchantId: string, status: MerchantStatus) {
  await getMerchant(merchantId); // ensure exists
  return merchantsRepo.updateStatus(merchantId, status);
}
