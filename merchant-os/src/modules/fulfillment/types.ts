import type { Order, OrderItem, OrderStatusHistory, Customer, Branch } from '@prisma/client';

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export interface KanbanColumn {
  status: OrderStatus;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeColor: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    status: 'NEW',
    label: 'جديد',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    status: 'ACCEPTED',
    label: 'مقبول',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  {
    status: 'PREPARING',
    label: 'قيد التحضير',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    status: 'READY',
    label: 'جاهز',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    status: 'OUT_FOR_DELIVERY',
    label: 'في الطريق',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    status: 'DELIVERED',
    label: 'تم التوصيل',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-700',
  },
];

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'جديد',
  ACCEPTED: 'مقبول',
  PREPARING: 'قيد التحضير',
  READY: 'جاهز للاستلام',
  OUT_FOR_DELIVERY: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  CANCELLED: 'ملغي',
  REJECTED: 'مرفوض',
};

export const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  NEW: 'قبول الطلب',
  ACCEPTED: 'بدء التحضير',
  PREPARING: 'جاهز للاستلام',
  READY: 'خرج للتوصيل',
  OUT_FOR_DELIVERY: 'تم التوصيل',
};

export const TERMINAL_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REJECTED'];
export const DELAY_THRESHOLD_MINUTES = 20;

export type ActiveOrder = Order & {
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  customer: Customer;
  branch: Branch | null;
};

export interface FulfillmentStats {
  totalToday: number;
  activeOrders: number;
  deliveredToday: number;
  revenueToday: number;
  avgPrepTime: number;
  delayedCount: number;
}
