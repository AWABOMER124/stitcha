import * as repo from '../repositories/reports.repository';
import { getDateBounds } from '../types';
import type { DateRange } from '../types';

export async function getFullReport(merchantId: string, range: DateRange) {
  const bounds = getDateBounds(range);

  const [summary, dailyRevenue, ordersByStatus, hourlyOrders, topProducts, topCustomers, branchStats, financialSummary] =
    await Promise.all([
      repo.getSalesSummary(merchantId, bounds),
      repo.getDailyRevenue(merchantId, bounds),
      repo.getOrdersByStatus(merchantId, bounds),
      repo.getHourlyOrders(merchantId, bounds),
      repo.getTopProducts(merchantId, bounds, 10),
      repo.getTopCustomers(merchantId, bounds, 10),
      repo.getBranchStats(merchantId, bounds),
      repo.getFinancialSummary(merchantId, bounds),
    ]);

  return { summary, dailyRevenue, ordersByStatus, hourlyOrders, topProducts, topCustomers, branchStats, financialSummary };
}
