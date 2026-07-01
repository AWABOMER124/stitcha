import prisma from '@/lib/db/prisma';

// ── Platform Overview ─────────────────────────────────────────────────────────

export async function getPlatformStats() {
  const [
    totalDistributors,
    activeDistributors,
    pendingDistributors,
    totalMerchants,
    activeMerchants,
    totalOrders,
    deliveredOrders,
    revenueAgg,
    newDistributorsThisMonth,
    newMerchantsThisMonth,
  ] = await Promise.all([
    prisma.distributor.count(),
    prisma.distributor.count({ where: { status: 'ACTIVE' } }),
    prisma.distributor.count({ where: { status: 'PENDING' } }),
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true },
    }),
    prisma.distributor.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.merchant.count({
      where: {
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  return {
    totalDistributors,
    activeDistributors,
    pendingDistributors,
    suspendedDistributors: totalDistributors - activeDistributors - pendingDistributors,
    totalMerchants,
    activeMerchants,
    totalOrders,
    deliveredOrders,
    totalRevenue: Number(revenueAgg._sum.total ?? 0),
    newDistributorsThisMonth,
    newMerchantsThisMonth,
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

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getDistributorById(id: string) {
  return prisma.distributor.findUnique({
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
}

export async function createDistributor(data: {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
}) {
  return prisma.distributor.create({ data });
}

export async function updateDistributorStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
  return prisma.distributor.update({ where: { id }, data: { status } });
}

export async function updateDistributor(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  logo: string;
  commissionRate: number;
}>) {
  return prisma.distributor.update({ where: { id }, data });
}

// ── Merchants (platform-wide) ─────────────────────────────────────────────────

export async function getAllMerchants(page = 1, limit = 25, search?: string, status?: string) {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

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
    where: { role: 'PLATFORM_OWNER' },
    select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: 'asc' },
  });
}

// ── Platform Finance ──────────────────────────────────────────────────────────

export async function getPlatformFinanceStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRevenue, monthRevenue, totalSettlements, pendingSettlements, completedSettlements] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.aggregate({
        where: { status: 'DELIVERED', completedAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.settlement.count(),
      prisma.settlement.count({ where: { status: 'PENDING' } }),
      prisma.settlement.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { netAmount: true, commission: true },
      }),
    ]);

  return {
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    monthRevenue: Number(monthRevenue._sum.total ?? 0),
    totalSettlements,
    pendingSettlements,
    totalCommissionCollected: Number(completedSettlements._sum.commission ?? 0),
    totalPaidOut: Number(completedSettlements._sum.netAmount ?? 0),
  };
}

export async function getRecentActivity() {
  const [recentOrders, recentMerchants, recentDistributors] = await Promise.all([
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
    prisma.distributor.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true, createdAt: true },
    }),
  ]);

  return { recentOrders, recentMerchants, recentDistributors };
}
