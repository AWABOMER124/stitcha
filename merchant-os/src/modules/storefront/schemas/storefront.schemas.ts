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
  paymentMethod: z.enum(['CASH', 'MANUAL_TRANSFER']).default('CASH'),
  paymentAccountId: z.string().optional(),
  transactionRef: z.string().trim().min(4).max(100).optional(),
  senderName: z.string().trim().max(120).optional(),
  transferredAt: z.coerce.date().optional(),
}).superRefine((data, context) => {
  if (data.paymentMethod === 'MANUAL_TRANSFER' && (!data.paymentAccountId || !data.transactionRef)) {
    context.addIssue({ code: 'custom', message: 'Payment account and transaction reference are required' });
  }
  if (data.transferredAt && data.transferredAt.getTime() > Date.now() + 10 * 60_000) {
    context.addIssue({ code: 'custom', message: 'Transfer date cannot be in the future', path: ['transferredAt'] });
  }
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
