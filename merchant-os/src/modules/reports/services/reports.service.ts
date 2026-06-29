import * as reportsRepo from '../repositories/reports.repository';
import prisma from '@/lib/db/prisma';

/**
 * Reports service — read-only business analytics.
 */

export async function getDashboardOverview(merchantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [sales, pendingOrders, lowStockCount] = await Promise.all([
    reportsRepo.getSalesOverview(merchantId, { from: today, to: tomorrow }),
    prisma.order.count({
      where: { merchantId, status: { in: ['NEW', 'ACCEPTED', 'PREPARING'] } },
    }),
    prisma.inventoryItem.count({
      where: {
        merchantId,
        trackInventory: true,
        quantity: { lte: 5 },
      },
    }),
  ]);

  return {
    todayOrders: sales.orderCount,
    todayRevenue: sales.totalSales,
    avgOrderValue: sales.avgOrderValue,
    pendingOrders,
    lowStockItems: lowStockCount,
  };
}

export async function getSalesReport(
  merchantId: string,
  dateRange: { from: Date; to: Date }
) {
  const [overview, byDay, byStatus] = await Promise.all([
    reportsRepo.getSalesOverview(merchantId, dateRange),
    reportsRepo.getSalesByDay(merchantId, 30),
    reportsRepo.getOrdersByStatus(merchantId, dateRange),
  ]);
  return { overview, dailySales: byDay, ordersByStatus: byStatus };
}

export async function getInventoryReport(merchantId: string) {
  const [totalItems, lowStock, outOfStock] = await Promise.all([
    prisma.inventoryItem.count({ where: { merchantId } }),
    prisma.inventoryItem.count({
      where: { merchantId, trackInventory: true, quantity: { gt: 0, lte: 5 } },
    }),
    prisma.inventoryItem.count({
      where: { merchantId, trackInventory: true, quantity: { lte: 0 } },
    }),
  ]);
  return { totalItems, lowStock, outOfStock };
}

export async function getTopProductsReport(
  merchantId: string,
  dateRange: { from: Date; to: Date }
) {
  return reportsRepo.getTopProducts(merchantId, dateRange, 10);
}
