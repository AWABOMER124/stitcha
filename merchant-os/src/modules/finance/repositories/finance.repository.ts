import prisma from '@/lib/db/prisma';
import type { Prisma, SettlementStatus } from '@prisma/client';
import type {
  CreateCommissionPlanInput,
  UpdateCommissionPlanInput,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  FinanceFilterInput,
} from '../schemas/finance.schemas';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';

// ── Commission Plans ──────────────────────────────────────────────────────────

export async function findAllCommissionPlans(distributorId: string) {
  const plans = await prisma.commissionPlan.findMany({
    where: { distributorId },
    include: { _count: { select: { merchants: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return serializePrismaArray(plans);
}

export async function findCommissionPlanById(distributorId: string, id: string) {
  const plan = await prisma.commissionPlan.findFirst({
    where: { id, distributorId },
    include: { merchants: { select: { id: true, name: true, status: true } } },
  });
  return serializePrismaObject(plan);
}

export async function createCommissionPlan(distributorId: string, data: CreateCommissionPlanInput) {
  if (data.isDefault) {
    await prisma.commissionPlan.updateMany({
      where: { distributorId, isDefault: true },
      data: { isDefault: false },
    });
  }
  const plan = await prisma.commissionPlan.create({
    data: { ...data, distributorId },
  });
  return serializePrismaObject(plan);
}

export async function updateCommissionPlan(
  distributorId: string,
  id: string,
  data: UpdateCommissionPlanInput,
) {
  if (data.isDefault) {
    await prisma.commissionPlan.updateMany({
      where: { distributorId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }
  const result = await prisma.commissionPlan.updateMany({ where: { id, distributorId }, data });
  if (result.count === 0) throw new Error('Commission plan not found');
  const plan = await prisma.commissionPlan.findUnique({ where: { id } });
  return serializePrismaObject(plan);
}

export async function deleteCommissionPlan(distributorId: string, id: string) {
  const result = await prisma.commissionPlan.deleteMany({ where: { id, distributorId } });
  if (result.count === 0) throw new Error('Commission plan not found');
  return result;
}

export async function assignCommissionPlanToMerchant(merchantId: string, planId: string | null) {
  return prisma.merchant.update({
    where: { id: merchantId },
    data: { commissionPlanId: planId },
  });
}

// ── Financial Transactions ────────────────────────────────────────────────────

export async function findAllTransactions(distributorId: string, filters: FinanceFilterInput) {
  const { page, limit, merchantId, dateFrom, dateTo, type } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.FinancialTransactionWhereInput = {
    distributorId,
    ...(merchantId && { merchantId }),
    ...(type && { type: type as Prisma.EnumTransactionTypeFilter }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      include: { merchant: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return { data: serializePrismaArray(data), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function findAllSettlements(distributorId: string, filters: FinanceFilterInput) {
  const { page, limit, merchantId, status } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.SettlementWhereInput = {
    distributorId,
    ...(merchantId && { merchantId }),
    ...(status && { status: status as Prisma.EnumSettlementStatusFilter }),
  };

  const [data, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: {
        merchant: { select: { id: true, name: true, logo: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.settlement.count({ where }),
  ]);

  return { data: serializePrismaArray(data), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function findSettlementById(distributorId: string, id: string) {
  const settlement = await prisma.settlement.findFirst({
    where: { id, distributorId },
    include: {
      merchant: true,
      transactions: { orderBy: { createdAt: 'desc' } },
    },
  });
  return serializePrismaObject(settlement);
}

export async function createSettlement(
  distributorId: string,
  data: {
    merchantId: string;
    periodFrom: Date;
    periodTo: Date;
    notes?: string;
    totalOrders: number;
    grossAmount: number;
    commission: number;
    fees: number;
    netAmount: number;
    currency: string;
  },
) {
  const settlement = await prisma.settlement.create({
    data: {
      distributorId,
      merchantId: data.merchantId,
      totalOrders: data.totalOrders,
      grossAmount: data.grossAmount,
      commission: data.commission,
      fees: data.fees,
      netAmount: data.netAmount,
      currency: data.currency,
      periodFrom: data.periodFrom,
      periodTo: data.periodTo,
      notes: data.notes,
    },
    include: { merchant: { select: { id: true, name: true } } },
  });
  return serializePrismaObject(settlement);
}

export async function updateSettlementStatus(
  distributorId: string,
  id: string,
  status: SettlementStatus,
  paidAt?: Date,
) {
  const result = await prisma.settlement.updateMany({
    where: { id, distributorId },
    data: {
      status,
      ...(paidAt && { paidAt }),
    },
  });
  if (result.count === 0) throw new Error('Settlement not found');
  const settlement = await prisma.settlement.findUnique({ where: { id } });
  return serializePrismaObject(settlement);
}

// ── Delivery Zones ────────────────────────────────────────────────────────────

export async function findAllDeliveryZones(distributorId: string) {
  const zones = await prisma.deliveryZone.findMany({
    where: { distributorId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return serializePrismaArray(zones);
}

export async function createDeliveryZone(distributorId: string, data: CreateDeliveryZoneInput) {
  const zone = await prisma.deliveryZone.create({ data: { ...data, distributorId } });
  return serializePrismaObject(zone);
}

export async function updateDeliveryZone(distributorId: string, id: string, data: UpdateDeliveryZoneInput) {
  const result = await prisma.deliveryZone.updateMany({ where: { id, distributorId }, data });
  if (result.count === 0) throw new Error('Delivery zone not found');
  const zone = await prisma.deliveryZone.findUnique({ where: { id } });
  return serializePrismaObject(zone);
}

export async function deleteDeliveryZone(distributorId: string, id: string) {
  const result = await prisma.deliveryZone.deleteMany({ where: { id, distributorId } });
  if (result.count === 0) throw new Error('Delivery zone not found');
  return result;
}

// ── Finance Summary ───────────────────────────────────────────────────────────

export async function getFinanceSummary(distributorId: string) {
  const [
    totalMerchants,
    activeMerchants,
    revenueAgg,
    feesAgg,
    commissionAgg,
    pendingSettlements,
  ] = await Promise.all([
    prisma.merchant.count({ where: { distributorId } }),
    prisma.merchant.count({ where: { distributorId, status: 'ACTIVE' } }),
    prisma.financialTransaction.aggregate({
      where: {
        distributorId,
        direction: 'CREDIT',
        type: { in: ['COMMISSION', 'SUBSCRIPTION_FEE', 'DELIVERY_FEE'] },
      },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { distributorId, type: 'SUBSCRIPTION_FEE' },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { distributorId, type: 'COMMISSION' },
      _sum: { amount: true },
    }),
    prisma.settlement.count({ where: { distributorId, status: 'PENDING' } }),
  ]);

  return {
    totalMerchants,
    activeMerchants,
    totalRevenue: Number(revenueAgg._sum.amount ?? 0),
    totalFees: Number(feesAgg._sum.amount ?? 0),
    totalCommissions: Number(commissionAgg._sum.amount ?? 0),
    pendingSettlements,
    currency: 'SDG',
  };
}

export async function getMerchantFinanceSummaries(distributorId: string) {
  const merchants = await prisma.merchant.findMany({
    where: { distributorId },
    select: {
      id: true,
      name: true,
      status: true,
      commissionPlan: true,
      _count: { select: { orders: true } },
      orders: {
        select: { total: true },
        where: { status: 'DELIVERED' },
      },
      settlements: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return merchants.map((m) => {
    const grossRevenue = m.orders.reduce((sum, o) => sum + Number(o.total), 0);
    const plan = m.commissionPlan;
    let commission = 0;
    if (plan) {
      if (plan.type === 'PERCENTAGE') {
        commission = (grossRevenue * Number(plan.rate)) / 100;
      } else if (plan.type === 'FLAT_FEE') {
        commission = Number(plan.rate) * m._count.orders;
      } else if (plan.type === 'HYBRID') {
        commission = Math.max(
          (grossRevenue * Number(plan.rate)) / 100,
          Number(plan.minFee) * m._count.orders,
        );
      } else if (plan.type === 'SUBSCRIPTION') {
        commission = Number(plan.rate);
      }
    }
    return {
      merchantId: m.id,
      merchantName: m.name,
      status: m.status,
      totalOrders: m._count.orders,
      totalRevenue: grossRevenue,
      commission,
      netAmount: grossRevenue - commission,
      commissionPlan: plan
        ? { name: plan.name, type: plan.type, rate: Number(plan.rate) }
        : null,
      lastSettlement: m.settlements[0]?.createdAt ?? null,
    };
  });
}

// ── Merchant-Facing Finance ───────────────────────────────────────────────────

export async function getMerchantFinanceOverview(merchantId: string) {
  const [merchant, ordersAgg, ordersThisMonth, settlements, lastSettlement] = await Promise.all([
    prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        name: true,
        currency: true,
        commissionPlan: {
          select: { name: true, type: true, rate: true, minFee: true },
        },
      },
    }),
    prisma.order.aggregate({
      where: { merchantId, status: 'DELIVERED' },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: {
        merchantId,
        status: 'DELIVERED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.settlement.count({ where: { merchantId, status: 'PENDING' } }),
    prisma.settlement.findFirst({
      where: { merchantId, status: 'COMPLETED' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true, netAmount: true, currency: true },
    }),
  ]);

  const totalRevenue = Number(ordersAgg._sum.total ?? 0);
  const totalOrders = ordersAgg._count.id;
  const monthRevenue = Number(ordersThisMonth._sum.total ?? 0);
  const monthOrders = ordersThisMonth._count.id;

  const plan = merchant?.commissionPlan;
  let estimatedCommission = 0;
  if (plan) {
    if (plan.type === 'PERCENTAGE') {
      estimatedCommission = (monthRevenue * Number(plan.rate)) / 100;
    } else if (plan.type === 'FLAT_FEE') {
      estimatedCommission = Number(plan.rate) * monthOrders;
    } else if (plan.type === 'HYBRID') {
      estimatedCommission = Math.max(
        (monthRevenue * Number(plan.rate)) / 100,
        Number(plan.minFee) * monthOrders,
      );
    } else if (plan.type === 'SUBSCRIPTION') {
      estimatedCommission = Number(plan.rate);
    }
  }

  return {
    currency: merchant?.currency ?? 'SDG',
    commissionPlan: plan
      ? { name: plan.name, type: plan.type, rate: Number(plan.rate), minFee: Number(plan.minFee) }
      : null,
    totalRevenue,
    totalOrders,
    monthRevenue,
    monthOrders,
    estimatedCommission,
    estimatedNet: monthRevenue - estimatedCommission,
    pendingSettlements: settlements,
    lastSettlement: lastSettlement
      ? { paidAt: lastSettlement.paidAt, netAmount: Number(lastSettlement.netAmount), currency: lastSettlement.currency }
      : null,
  };
}

export async function findMerchantTransactions(merchantId: string, filters: FinanceFilterInput) {
  const { page, limit, dateFrom, dateTo, type } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.FinancialTransactionWhereInput = {
    merchantId,
    ...(type && { type: type as Prisma.EnumTransactionTypeFilter }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return { data: serializePrismaArray(data), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function findMerchantSettlements(merchantId: string, filters: FinanceFilterInput) {
  const { page, limit, status } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.SettlementWhereInput = {
    merchantId,
    ...(status && { status: status as Prisma.EnumSettlementStatusFilter }),
  };

  const [data, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.settlement.count({ where }),
  ]);

  return { data: serializePrismaArray(data), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
