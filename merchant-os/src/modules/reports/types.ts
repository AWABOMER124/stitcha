export type SalesOverview = {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
};

export type DashboardOverview = {
  todayOrders: number;
  todayRevenue: number;
  avgOrderValue: number;
  pendingOrders: number;
  lowStockItems: number;
};
