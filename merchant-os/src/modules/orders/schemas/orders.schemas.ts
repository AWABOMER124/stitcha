import { z } from 'zod';

// ============================================================================
// Order Schemas
// ============================================================================

/** Schema for order item modifiers */
const orderItemModifierSchema = z.object({
  name: z.string(),
  option: z.string(),
  price: z.number().min(0),
});

/** Schema for order items */
const orderItemSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  modifiers: z.array(orderItemModifierSchema).optional(),
  notes: z.string().optional(),
});

/** Schema for creating a new order */
export const createOrderSchema = z.object({
  customerId: z.string().cuid().optional(),
  customerName: z.string().min(2).optional(),
  customerPhone: z.string().min(9).optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  deliveryMethod: z.enum(['PICKUP', 'MERCHANT_DELIVERY', 'WASLAK_DELIVERY', 'EXTERNAL_DELIVERY']),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'WALLET']),
  notes: z.string().max(500).optional(),
  customerAddress: z.string().optional(),
  branchId: z.string().cuid().optional(),
}).refine(
  (data) => data.customerId || (data.customerName && data.customerPhone),
  { message: 'Either customerId or customerName+customerPhone is required' }
);

/** Schema for updating order status */
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'NEW', 'ACCEPTED', 'PREPARING', 'READY',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED',
  ]),
  note: z.string().max(500).optional(),
});

/** Schema for filtering orders */
export const orderFilterSchema = z.object({
  status: z.enum([
    'NEW', 'ACCEPTED', 'PREPARING', 'READY',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED',
  ]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
