export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter';

export interface DateBounds {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  cancelledOrders: number;
  cancellationRate: number;
  newCustomers: number;
  totalDiscount: number;
  revenueChange: number;
  ordersChange: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface HourlyOrders {
  hour: number;
  label: string;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  category: string | null;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  segment: string;
}

export interface BranchStat {
  id: string;
  name: string;
  orders: number;
  revenue: number;
  cancellations: number;
}

export interface FinancialSummary {
  grossRevenue: number;
  deliveryFees: number;
  discounts: number;
  netRevenue: number;
}

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

export function getDateBounds(range: DateRange): DateBounds {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const DAY = 86400000;

  switch (range) {
    case 'today': return {
      from: today,
      to: new Date(today.getTime() + DAY - 1),
      prevFrom: new Date(today.getTime() - DAY),
      prevTo: new Date(today.getTime() - 1),
    };
    case 'yesterday': return {
      from: new Date(today.getTime() - DAY),
      to: new Date(today.getTime() - 1),
      prevFrom: new Date(today.getTime() - DAY * 2),
      prevTo: new Date(today.getTime() - DAY - 1),
    };
    case 'week': return {
      from: new Date(today.getTime() - DAY * 7),
      to: new Date(today.getTime() + DAY - 1),
      prevFrom: new Date(today.getTime() - DAY * 14),
      prevTo: new Date(today.getTime() - DAY * 7 - 1),
    };
    case 'month': return {
      from: new Date(today.getTime() - DAY * 30),
      to: new Date(today.getTime() + DAY - 1),
      prevFrom: new Date(today.getTime() - DAY * 60),
      prevTo: new Date(today.getTime() - DAY * 30 - 1),
    };
    case 'quarter': return {
      from: new Date(today.getTime() - DAY * 90),
      to: new Date(today.getTime() + DAY - 1),
      prevFrom: new Date(today.getTime() - DAY * 180),
      prevTo: new Date(today.getTime() - DAY * 90 - 1),
    };
  }
}

export const STATUS_AR: Record<string, { label: string; color: string }> = {
  DELIVERED:        { label: 'مُسلَّم',     color: '#10b981' },
  CANCELLED:        { label: 'ملغي',        color: '#ef4444' },
  REJECTED:         { label: 'مرفوض',       color: '#f97316' },
  OUT_FOR_DELIVERY: { label: 'في الطريق',   color: '#8b5cf6' },
  PREPARING:        { label: 'قيد التحضير', color: '#f59e0b' },
  ACCEPTED:         { label: 'مقبول',       color: '#6366f1' },
  READY:            { label: 'جاهز',        color: '#14b8a6' },
  NEW:              { label: 'جديد',        color: '#3b82f6' },
};
