import type { Order, OrderItem, OrderStatusHistory, Customer, Delivery, Payment, OrderStatus } from '@prisma/client';

// ============================================================================
// Orders Module — Types
// ============================================================================

/** Full order with all relations loaded */
export interface OrderFull extends Order {
  items: (OrderItem & { product: { name: string; images: unknown } | null })[];
  statusHistory: OrderStatusHistory[];
  customer: Customer;
  delivery: Delivery | null;
  payment: Payment | null;
}

/** Product snapshot stored in order items */
export interface ProductSnapshot {
  name: string;
  price: number;
  image: string | null;
  sku: string | null;
}

/** Today's order overview */
export interface TodayOverview {
  totalOrders: number;
  revenue: number | unknown;
  pendingOrders: number;
}

/** Valid status transitions map */
export type StatusTransitionMap = Record<OrderStatus, OrderStatus[]>;

export type { Order, OrderItem, OrderStatusHistory, OrderStatus };
