'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as merchantsService from './services/merchants.service';
import { createMerchantSchema, updateMerchantSchema, merchantSettingsSchema } from './schemas/merchants.schemas';
import type { ActionResult } from '@/lib/types';
import type { Merchant, MerchantStatus } from '@prisma/client';

// ============================================================================
// Merchants Module — Server Actions
// ============================================================================

/**
 * Get merchant details by ID.
 */
export async function getMerchantAction(id: string): Promise<ActionResult<Merchant>> {
  try {
    const auth = await getAuthContext();
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
    const merchant = await merchantsService.updateMerchantStatus(merchantId, status);
    return { success: true, data: merchant };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update merchant status' };
  }
}
