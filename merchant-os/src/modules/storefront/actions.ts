'use server';

import { auth } from '@/lib/auth/config';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db/prisma';
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

/** Save storefront customization settings */
export async function saveStorefrontSettingsAction(data: {
  theme?: Record<string, any>;
  bannerImage?: string;
  welcomeText?: string;
  isOpen?: boolean;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  minimumOrderAmount?: number;
  socialLinks?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    await prisma.storefrontSettings.upsert({
      where: { merchantId: session.user.merchantId },
      update: data,
      create: { merchantId: session.user.merchantId, ...data },
    });
    revalidatePath('/dashboard/storefront');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
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
