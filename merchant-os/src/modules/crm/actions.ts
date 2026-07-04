'use server';

import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import * as crmService from './services/crm.service';
import {
  updateCustomerSchema,
  createPromoCodeSchema,
  updateLoyaltyConfigSchema,
} from './schemas/crm.schemas';
import type { ActionResult } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { CustomerSegment } from '@prisma/client';

async function getMerchantId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  return session.user.merchantId;
}

export async function getAllCustomersAction(segment?: CustomerSegment): Promise<ActionResult<unknown[]>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getAllCustomers(merchantId, segment);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getCustomerAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getCustomer(merchantId, id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateCustomerAction(id: string, input: unknown): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const parsed = updateCustomerSchema.parse(input);
    const data = await crmService.updateCustomer(merchantId, id, parsed);
    revalidatePath('/dashboard/crm');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getCustomerOrdersAction(id: string): Promise<ActionResult<unknown[]>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getCustomerOrders(merchantId, id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getCustomerStatsAction(): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getStats(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getAllPromoCodesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getAllPromoCodes(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createPromoCodeAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const parsed = createPromoCodeSchema.parse(input);
    const data = await crmService.createPromoCode(merchantId, parsed);
    revalidatePath('/dashboard/crm/promos');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function togglePromoCodeAction(id: string, isActive: boolean): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.togglePromoCode(merchantId, id, isActive);
    revalidatePath('/dashboard/crm/promos');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deletePromoCodeAction(id: string): Promise<ActionResult<null>> {
  try {
    const merchantId = await getMerchantId();
    await crmService.deletePromoCode(merchantId, id);
    revalidatePath('/dashboard/crm/promos');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getLoyaltyConfigAction(): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getLoyaltyConfig(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateLoyaltyConfigAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const merchantId = await getMerchantId();
    const parsed = updateLoyaltyConfigSchema.parse(input);
    const data = await crmService.updateLoyaltyConfig(merchantId, parsed);
    revalidatePath('/dashboard/crm/loyalty');
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getLoyaltyLeaderboardAction(): Promise<ActionResult<unknown[]>> {
  try {
    const merchantId = await getMerchantId();
    const data = await crmService.getLoyaltyLeaderboard(merchantId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
