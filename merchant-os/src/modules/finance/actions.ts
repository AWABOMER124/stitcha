'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as financeService from './services/finance.service';
import {
  createCommissionPlanSchema,
  updateCommissionPlanSchema,
  assignCommissionPlanSchema,
  createSettlementSchema,
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  financeFilterSchema,
} from './schemas/finance.schemas';
import type { ActionResult } from '@/lib/types';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

// ── Commission Plans ──────────────────────────────────────────────────────────

export async function getCommissionPlansAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await financeService.getCommissionPlans(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createCommissionPlanAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createCommissionPlanSchema.parse(input);
    const data = await financeService.createCommissionPlan(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateCommissionPlanAction(
  id: string,
  input: unknown,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = updateCommissionPlanSchema.parse(input);
    const data = await financeService.updateCommissionPlan(distributorId, id, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteCommissionPlanAction(id: string): Promise<ActionResult<null>> {
  try {
    const distributorId = await getDistributorId();
    await financeService.deleteCommissionPlan(distributorId, id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function assignCommissionPlanAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = assignCommissionPlanSchema.parse(input);
    const data = await financeService.assignCommissionPlan(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function getSettlementsAction(filters: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = financeFilterSchema.parse(filters);
    const data = await financeService.getSettlements(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createSettlementAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createSettlementSchema.parse(input);
    const data = await financeService.createSettlement(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function markSettlementPaidAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await financeService.markSettlementPaid(distributorId, id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

// ── Delivery Zones ────────────────────────────────────────────────────────────

export async function getDeliveryZonesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await financeService.getDeliveryZones(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createDeliveryZoneAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createDeliveryZoneSchema.parse(input);
    const data = await financeService.createDeliveryZone(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function updateDeliveryZoneAction(
  id: string,
  input: unknown,
): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = updateDeliveryZoneSchema.parse(input);
    const data = await financeService.updateDeliveryZone(distributorId, id, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function deleteDeliveryZoneAction(id: string): Promise<ActionResult<null>> {
  try {
    const distributorId = await getDistributorId();
    await financeService.deleteDeliveryZone(distributorId, id);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

// ── Finance Overview ──────────────────────────────────────────────────────────

export async function getFinanceSummaryAction(): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const data = await financeService.getFinanceSummary(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getMerchantFinanceSummariesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await financeService.getMerchantFinanceSummaries(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
