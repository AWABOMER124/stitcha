'use server';

import { placeOrderSchema } from './schemas/storefront.schemas';
import * as storefrontService from './services/storefront.service';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

/** Place an order from the public storefront */
export async function placeOrderAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const data = placeOrderSchema.parse(input);
    const result = await storefrontService.placeOrder(slug, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Order failed' };
  }
}

/** Get public order status for tracking */
export async function getOrderStatusAction(
  orderId: string
): Promise<ActionResult<Awaited<ReturnType<typeof storefrontService.getOrderStatus>>>> {
  try {
    const order = await storefrontService.getOrderStatus(orderId);
    return { success: true, data: order };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Order not found' };
  }
}
