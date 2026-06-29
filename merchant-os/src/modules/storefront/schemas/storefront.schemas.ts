import { z } from 'zod';

/** Public storefront checkout schema */
export const placeOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  customerPhone: z.string().min(9, 'Valid phone is required'),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1, 'At least one item is required'),
  deliveryMethod: z.enum(['PICKUP', 'MERCHANT_DELIVERY']).default('PICKUP'),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
