import prisma from '@/lib/db/prisma';
import type { DateBounds, DailyRevenue, HourlyOrders, TopProduct, TopCustomer, BranchStat } from '../types';
import { STATUS_AR } from '../types';

// ── Sales Summary ─────────────────────────────────────────────────────────────

export async function getSalesSummary(merchantId: string, bounds: DateBounds) {
  const { from, to, prevFrom, prevTo } = bounds;

  const [current, previous, newCustomers, cancelledCount] = await Promise.all([
    prisma.order.aggregate({
      where: { merchantId, createdAt: { gte: from, lte: to } },
      _sum: { total: true, discount: true, deliveryFee: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { merchantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.customer.count({
      where: { merchantId, createdAt: { gte: from, lte: to } },
    }),
    prisma.order.count({
      where: { merchantId, createdAt: { gte: from, lte: to }, status: { in: ['CANCELLED', 'REJECTED'] } },
    }),
  ]);

  const totalOrders = current._count.id;
  const totalRevenue = Number(current._sum.total ?? 0);
  const prevRevenue = Number(previous._sum.total ?? 0);
  const prevOrders = previous._count.id;

  return {
    totalOrders,
    totalRevenue,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    cancelledOrders: cancelledCount,
    cancellationRate: totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0,
    newCustomers,
    totalDiscount: Number(current._sum.discount ?? 0),
    revenueChange: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    ordersChange: prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0,
  };
}

// ── Daily Revenue Trend ───────────────────────────────────────────────────────

export async function getDailyRevenue(merchantId: string, bounds: DateBounds): Promise<DailyRevenue[]> {
  const orders = await prisma.order.findMany({
    where: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to }, status: 'DELIVERED' },
    select: { total: true, createdAt: true },
  });

  const byDay = new Map<string, { revenue: number; orders: number }>();
  const cursor = new Date(bounds.from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= bounds.to) {
    const key = cursor.toISOString().slice(0, 10);
    byDay.set(key, { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    if (entry) { entry.revenue += Number(o.total); entry.orders += 1; }
  }

  return Array.from(byDay.entries()).map(([date, d]) => ({
    date,
    revenue: Math.round(d.revenue * 100) / 100,
    orders: d.orders,
  }));
}

// ── Orders by Status ──────────────────────────────────────────────────────────

export async function getOrdersByStatus(merchantId: string, bounds: DateBounds) {
  const results = await prisma.order.groupBy({
    by: ['status'],
    where: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to } },
    _count: { id: true },
  });

  return results.map((r) => ({
    status: r.status,
    label: STATUS_AR[r.status]?.label ?? r.status,
    count: r._count.id,
    color: STATUS_AR[r.status]?.color ?? '#94a3b8',
  }));
}

// ── Peak Hours ────────────────────────────────────────────────────────────────

export async function getHourlyOrders(merchantId: string, bounds: DateBounds): Promise<HourlyOrders[]> {
  const orders = await prisma.order.findMany({
    where: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to } },
    select: { createdAt: true },
  });

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of orders) byHour[o.createdAt.getHours()].orders += 1;

  return byHour.map((h) => ({
    hour: h.hour,
    label: `${h.hour.toString().padStart(2, '0')}:00`,
    orders: h.orders,
  }));
}

// ── Top Products ──────────────────────────────────────────────────────────────

export async function getTopProducts(merchantId: string, bounds: DateBounds, limit = 10): Promise<TopProduct[]> {
  const items = await prisma.orderItem.findMany({
    where: { order: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to }, status: 'DELIVERED' } },
    select: { productId: true, quantity: true, productSnapshot: true },
  });

  const byProduct = new Map<string, { name: string; quantity: number; revenue: number; category: string | null }>();

  for (const item of items) {
    const snap = item.productSnapshot as { name?: string; price?: number; category?: string } | null;
    const name = snap?.name ?? 'منتج محذوف';
    const key = item.productId ?? name;
    const lineTotal = (snap?.price ?? 0) * item.quantity;
    const existing = byProduct.get(key);
    if (existing) { existing.quantity += item.quantity; existing.revenue += lineTotal; }
    else byProduct.set(key, { name, quantity: item.quantity, revenue: lineTotal, category: snap?.category ?? null });
  }

  return Array.from(byProduct.entries())
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

// ── Top Customers ─────────────────────────────────────────────────────────────

export async function getTopCustomers(merchantId: string, bounds: DateBounds, limit = 10): Promise<TopCustomer[]> {
  const results = await prisma.order.groupBy({
    by: ['customerId'],
    where: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to }, status: 'DELIVERED' },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  const ids = results.map((r) => r.customerId);
  const customers = await prisma.customer.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, phone: true, segment: true },
  });
  const cMap = new Map(customers.map((c) => [c.id, c]));

  return results.map((r) => {
    const c = cMap.get(r.customerId);
    return { id: r.customerId, name: c?.name ?? '—', phone: c?.phone ?? '—', segment: c?.segment ?? 'NEW', totalOrders: r._count.id, totalSpent: Number(r._sum.total ?? 0) };
  });
}

// ── Branch Performance ────────────────────────────────────────────────────────

export async function getBranchStats(merchantId: string, bounds: DateBounds): Promise<BranchStat[]> {
  const branches = await prisma.branch.findMany({
    where: { merchantId },
    select: { id: true, name: true },
  });

  if (branches.length === 0) return [];

  const results = await Promise.all(
    branches.map(async (branch) => {
      const [agg, cancellations] = await Promise.all([
        prisma.order.aggregate({
          where: { merchantId, branchId: branch.id, createdAt: { gte: bounds.from, lte: bounds.to } },
          _sum: { total: true },
          _count: { id: true },
        }),
        prisma.order.count({
          where: { merchantId, branchId: branch.id, createdAt: { gte: bounds.from, lte: bounds.to }, status: { in: ['CANCELLED', 'REJECTED'] } },
        }),
      ]);
      return { id: branch.id, name: branch.name, orders: agg._count.id, revenue: Number(agg._sum.total ?? 0), cancellations };
    })
  );

  return results.sort((a, b) => b.revenue - a.revenue);
}

// ── Financial Summary ─────────────────────────────────────────────────────────

export async function getFinancialSummary(merchantId: string, bounds: DateBounds) {
  const agg = await prisma.order.aggregate({
    where: { merchantId, createdAt: { gte: bounds.from, lte: bounds.to }, status: 'DELIVERED' },
    _sum: { total: true, subtotal: true, deliveryFee: true, discount: true, tax: true },
    _count: { id: true },
  });

  const net = Number(agg._sum.total ?? 0);
  const count = agg._count.id;

  return {
    grossRevenue: Number(agg._sum.subtotal ?? 0),
    deliveryFees: Number(agg._sum.deliveryFee ?? 0),
    discounts: Number(agg._sum.discount ?? 0),
    tax: Number(agg._sum.tax ?? 0),
    netRevenue: net,
    avgOrderValue: count > 0 ? net / count : 0,
  };
}
