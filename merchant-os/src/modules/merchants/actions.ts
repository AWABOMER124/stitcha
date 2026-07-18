'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import { ForbiddenError } from '@/lib/errors';
import * as merchantsService from './services/merchants.service';
import { createMerchantSchema, updateMerchantSchema } from './schemas/merchants.schemas';
import type { ActionResult } from '@/lib/types';
import type { Merchant, MerchantStatus } from '@prisma/client';

// ============================================================================
// Merchants Module — Server Actions
//
// These are merchant self-service actions: every ID-taking action must be
// scoped to the caller's own merchant, since requirePermission() bypasses
// its (currently empty) granular permission list for MERCHANT_OWNER/
// PLATFORM_OWNER roles and would otherwise let one merchant act on another.
// ============================================================================

function assertOwnMerchant(auth: { merchantId: string; role: string }, merchantId: string): void {
  if (auth.role === 'PLATFORM_OWNER') return;
  if (auth.merchantId !== merchantId) {
    throw new ForbiddenError('Cannot access another merchant');
  }
}

/**
 * Get merchant details by ID.
 */
export async function getMerchantAction(id: string): Promise<ActionResult<Merchant>> {
  try {
    const auth = await getAuthContext();
    assertOwnMerchant(auth, id);
    const merchant = await merchantsService.getMerchant(id);
    return { success: true, data: merchant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get merchant' };
  }
}

/**
 * Create a new merchant.
 */
export async function createMerchantAction(formData: unknown): Promise<ActionResult<Merchant>> {
  try {
    const auth = await getAuthContext();
    const parsed = createMerchantSchema.parse(formData);
    const merchant = await merchantsService.createMerchant(parsed, auth.userId);
    return { success: true, data: merchant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create merchant' };
  }
}

/**
 * Update an existing merchant.
 */
export async function updateMerchantAction(
  merchantId: string,
  formData: unknown
): Promise<ActionResult<Merchant>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'merchants:update');
    assertOwnMerchant(auth, merchantId);
    const parsed = updateMerchantSchema.parse(formData);
    const merchant = await merchantsService.updateMerchant(merchantId, parsed);
    return { success: true, data: merchant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update merchant' };
  }
}

/**
 * Update merchant status.
 */
export async function updateMerchantStatusAction(
  merchantId: string,
  status: MerchantStatus
): Promise<ActionResult<Merchant>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'merchants:update');
    assertOwnMerchant(auth, merchantId);
    const merchant = await merchantsService.updateMerchantStatus(merchantId, status);
    return { success: true, data: merchant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update merchant status' };
  }
}
