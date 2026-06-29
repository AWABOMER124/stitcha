import type { OrderStatus } from '@prisma/client';

export const APP_NAME = 'Waslak Merchant OS';
export const DEFAULT_CURRENCY = 'SDG';
export const DEFAULT_TIMEZONE = 'Africa/Khartoum';
export const ITEMS_PER_PAGE = 20;

/** Valid order status transitions */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};
