import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

// ── Platform Overview ─────────────────────────────────────────────────────────

export async function getPlatformStats() {
  const [
    totalMerchants,
    activeMerchants,
    pendingMerchants,
    suspendedMerchants,
    totalOrders,
    deliveredOrders,
    revenueAgg,
    newMerchantsThisMonth,
    pendingSubscriptionPayments,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'PENDING' } }),
    prisma.merchant.count({ where: { status: 'SUSPENDED' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true },
    }),
    prisma.merchant.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.merchantSubscriptionPayment.count({ where: { status: 'PENDING' } }),
    prisma.merchantSubscription.count({ where: { status: 'ACTIVE' } }),
  ]);

  return {
    totalMerchants,
    activeMerchants,
    pendingMerchants,
    suspendedMerchants,
    totalOrders,
    deliveredOrders,
    totalRevenue: Number(revenueAgg._sum.total ?? 0),
    newMerchantsThisMonth,
    pendingSubscriptionPayments,
    activeSubscriptions,
  };
}

// ── Distributors ──────────────────────────────────────────────────────────────

export async function getAllDistributors(page = 1, limit = 20, search?: string) {
  const skip = (page - 1) * limit;
  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [data, total] = await Promise.all([
    prisma.distributor.findMany({
      where,
      include: {
        _count: { select: { merchants: true, drivers: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.distributor.count({ where }),
  ]);

  return {
    // commissionRate is a Prisma Decimal — not serializable across the
    // Server Action boundary, so it must be converted to a plain number.
    data: data.map((d) => ({ ...d, commissionRate: Number(d.commissionRate) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getDistributorById(id: string) {
  const distributor = await prisma.distributor.findUnique({
    where: { id },
    include: {
      users: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      merchants: {
        select: {
          id: true, name: true, slug: true, status: true, businessType: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { merchants: true, drivers: true, commissionPlans: true } },
    },
  });
  if (!distributor) return null;
  return { ...distributor, commissionRate: Number(distributor.commissionRate) };
}

export async function createDistributor(data: {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
}) {
  const distributor = await prisma.distributor.create({ data });
  return { ...distributor, commissionRate: Number(distributor.commissionRate) };
}

export async function updateDistributorStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
  const distributor = await prisma.distributor.update({ where: { id }, data: { status } });
  return { ...distributor, commissionRate: Number(distributor.commissionRate) };
}

export async function updateDistributor(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  logo: string;
  commissionRate: number;
}>) {
  const distributor = await prisma.distributor.update({ where: { id }, data });
  return { ...distributor, commissionRate: Number(distributor.commissionRate) };
}

// ── Merchants (platform-wide) ─────────────────────────────────────────────────

export async function getAllMerchants(page = 1, limit = 25, search?: string, status?: string) {
  const skip = (page - 1) * limit;
  const where: Prisma.MerchantWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status as Prisma.MerchantWhereInput['status'];

  const [data, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        distributor: { select: { id: true, name: true } },
        _count: { select: { orders: true, products: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.merchant.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ── Platform Users ────────────────────────────────────────────────────────────

export async function getPlatformUsers() {
  return prisma.user.findMany({
    where: { role: { in: ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_OPERATIONS', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT'] } },
    select: { id: true, name: true, email: true, role: true, platformAccessEnabled: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ── Platform Finance ──────────────────────────────────────────────────────────

export async function getPlatformFinanceStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [platformRevenue, monthPlatformRevenue, pendingPayments, activeSubscriptions, gmv, deliveredOrders] =
    await Promise.all([
      prisma.merchantSubscriptionPayment.aggregate({ where: { status: 'VERIFIED' }, _sum: { amount: true } }),
      prisma.merchantSubscriptionPayment.aggregate({ where: { status: 'VERIFIED', reviewedAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.merchantSubscriptionPayment.count({ where: { status: 'PENDING' } }),
      prisma.merchantSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
    ]);

  return {
    platformRevenue: Number(platformRevenue._sum.amount ?? 0),
    monthPlatformRevenue: Number(monthPlatformRevenue._sum?.amount ?? 0),
    pendingPayments,
    activeSubscriptions,
    grossMerchandiseValue: Number(gmv._sum.total ?? 0),
    deliveredOrders,
  };
}

export async function getMerchantById(id: string) {
  return prisma.merchant.findUnique({
    where: { id },
    include: {
      users: { where: { isActive: true }, include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      subscription: { include: { plan: true } },
      storefrontSettings: true,
      _count: { select: { products: true, orders: true, customers: true, branches: true } },
      orders: { take: 8, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true } },
    },
  });
}

export async function updateMerchantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') {
  return prisma.merchant.update({ where: { id }, data: { status, isActive: status === 'ACTIVE' } });
}

export async function getRecentActivity() {
  const [recentOrders, recentMerchants] = await Promise.all([
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { name: true } } },
    }),
    prisma.merchant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true, businessType: true, createdAt: true },
    }),
  ]);

  return {
    // Decimal fields must be converted to plain numbers — Prisma's Decimal
    // class instances aren't serializable across the Server Action boundary.
    recentOrders: recentOrders.map((o) => ({ ...o, total: Number(o.total) })),
    recentMerchants,
  };
}
