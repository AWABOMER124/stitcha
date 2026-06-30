import prisma from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/errors';
import * as financeRepo from '../repositories/finance.repository';
import type {
  CreateCommissionPlanInput,
  UpdateCommissionPlanInput,
  AssignCommissionPlanInput,
  CreateSettlementInput,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  FinanceFilterInput,
} from '../schemas/finance.schemas';

// ── Commission Plans ──────────────────────────────────────────────────────────

export async function getCommissionPlans(distributorId: string) {
  return financeRepo.findAllCommissionPlans(distributorId);
}

export async function getCommissionPlan(distributorId: string, id: string) {
  const plan = await financeRepo.findCommissionPlanById(distributorId, id);
  if (!plan) throw new NotFoundError('Commission plan not found');
  return plan;
}

export async function createCommissionPlan(
  distributorId: string,
  input: CreateCommissionPlanInput,
) {
  return financeRepo.createCommissionPlan(distributorId, input);
}

export async function updateCommissionPlan(
  distributorId: string,
  id: string,
  input: UpdateCommissionPlanInput,
) {
  await getCommissionPlan(distributorId, id);
  return financeRepo.updateCommissionPlan(distributorId, id, input);
}

export async function deleteCommissionPlan(distributorId: string, id: string) {
  const plan = await financeRepo.findCommissionPlanById(distributorId, id);
  if (!plan) throw new NotFoundError('Commission plan not found');
  if (plan.merchants.length > 0) {
    throw new Error(`Cannot delete plan with ${plan.merchants.length} assigned merchant(s)`);
  }
  return financeRepo.deleteCommissionPlan(id);
}

export async function assignCommissionPlan(
  distributorId: string,
  input: AssignCommissionPlanInput,
) {
  const merchant = await prisma.merchant.findFirst({
    where: { id: input.merchantId, distributorId },
  });
  if (!merchant) throw new NotFoundError('Merchant not found');

  const plan = await financeRepo.findCommissionPlanById(distributorId, input.planId);
  if (!plan) throw new NotFoundError('Commission plan not found');

  return financeRepo.assignCommissionPlanToMerchant(input.merchantId, input.planId);
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function getSettlements(distributorId: string, filters: FinanceFilterInput) {
  return financeRepo.findAllSettlements(distributorId, filters);
}

export async function getSettlement(distributorId: string, id: string) {
  const settlement = await financeRepo.findSettlementById(distributorId, id);
  if (!settlement) throw new NotFoundError('Settlement not found');
  return settlement;
}

export async function createSettlement(
  distributorId: string,
  input: CreateSettlementInput,
) {
  const merchant = await prisma.merchant.findFirst({
    where: { id: input.merchantId, distributorId },
    include: { commissionPlan: true },
  });
  if (!merchant) throw new NotFoundError('Merchant not found');

  const orders = await prisma.order.findMany({
    where: {
      merchantId: input.merchantId,
      status: 'DELIVERED',
      completedAt: { gte: input.periodFrom, lte: input.periodTo },
    },
    select: { total: true, deliveryFee: true },
  });

  const totalOrders = orders.length;
  const grossAmount = orders.reduce((s, o) => s + Number(o.total), 0);
  const plan = merchant.commissionPlan;
  let commission = 0;

  if (plan) {
    if (plan.type === 'PERCENTAGE') {
      commission = (grossAmount * Number(plan.rate)) / 100;
    } else if (plan.type === 'FLAT_FEE') {
      commission = Number(plan.rate) * totalOrders;
    } else if (plan.type === 'HYBRID') {
      commission = Math.max(
        (grossAmount * Number(plan.rate)) / 100,
        Number(plan.minFee) * totalOrders,
      );
    } else if (plan.type === 'SUBSCRIPTION') {
      commission = Number(plan.rate);
    }
  }

  const fees = 0;
  const netAmount = grossAmount - commission - fees;

  return financeRepo.createSettlement(distributorId, {
    ...input,
    totalOrders,
    grossAmount,
    commission,
    fees,
    netAmount,
    currency: merchant.currency,
  });
}

export async function markSettlementPaid(distributorId: string, id: string) {
  const settlement = await financeRepo.findSettlementById(distributorId, id);
  if (!settlement) throw new NotFoundError('Settlement not found');
  if (settlement.status === 'COMPLETED') throw new Error('Settlement already completed');
  return financeRepo.updateSettlementStatus(id, 'COMPLETED', new Date());
}

// ── Delivery Zones ────────────────────────────────────────────────────────────

export async function getDeliveryZones(distributorId: string) {
  return financeRepo.findAllDeliveryZones(distributorId);
}

export async function createDeliveryZone(
  distributorId: string,
  input: CreateDeliveryZoneInput,
) {
  return financeRepo.createDeliveryZone(distributorId, input);
}

export async function updateDeliveryZone(
  distributorId: string,
  id: string,
  input: UpdateDeliveryZoneInput,
) {
  const zone = await prisma.deliveryZone.findFirst({ where: { id, distributorId } });
  if (!zone) throw new NotFoundError('Delivery zone not found');
  return financeRepo.updateDeliveryZone(id, input);
}

export async function deleteDeliveryZone(distributorId: string, id: string) {
  const zone = await prisma.deliveryZone.findFirst({ where: { id, distributorId } });
  if (!zone) throw new NotFoundError('Delivery zone not found');
  return financeRepo.deleteDeliveryZone(id);
}

// ── Finance Overview ──────────────────────────────────────────────────────────

export async function getFinanceSummary(distributorId: string) {
  return financeRepo.getFinanceSummary(distributorId);
}

export async function getMerchantFinanceSummaries(distributorId: string) {
  return financeRepo.getMerchantFinanceSummaries(distributorId);
}

// ── Merchant-Facing Finance ───────────────────────────────────────────────────

export async function getMerchantFinanceOverview(merchantId: string) {
  return financeRepo.getMerchantFinanceOverview(merchantId);
}

export async function getMerchantTransactions(merchantId: string, filters: FinanceFilterInput) {
  return financeRepo.findMerchantTransactions(merchantId, filters);
}

export async function getMerchantSettlements(merchantId: string, filters: FinanceFilterInput) {
  return financeRepo.findMerchantSettlements(merchantId, filters);
}
