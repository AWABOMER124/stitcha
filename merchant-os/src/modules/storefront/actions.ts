'use server';

import { auth } from '@/lib/auth/config';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { placeOrderSchema } from './schemas/storefront.schemas';
import * as storefrontService from './services/storefront.service';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { generateStoreContent } from '@/services/ai/ai-store-content.service';
import type { StoreContentResult } from '@/services/ai/types';
import { storeContentSchema, storeGenerationPromptSchema } from '@/services/ai/store-content.schema';
import * as categoriesService from '@/modules/categories/services/categories.service';
import * as productsService from '@/modules/products/services/products.service';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function getRequestIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return h.get('x-real-ip')?.trim() ?? 'unknown';
}

/** Place an order from the public storefront */
export async function placeOrderAction(
  slug: string,
  input: unknown
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    // 20 orders / min per IP — same public-write limit as the mobile /api/orders route.
    enforceRateLimit(`place-order:${await getRequestIp()}`, 20, 60_000);

    const data = placeOrderSchema.parse(input);
    const result = await storefrontService.placeOrder(slug, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Order failed' };
  }
}

/** Save storefront customization settings */
export async function saveStorefrontSettingsAction(data: {
  theme?: Prisma.InputJsonValue;
  bannerImage?: string;
  welcomeText?: string;
  isOpen?: boolean;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  minimumOrderAmount?: number;
  socialLinks?: Prisma.InputJsonValue;
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
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'حدث خطأ' };
  }
}

/** Generate a draft store (name/content/catalog) from a prompt — preview only, writes nothing. */
export async function generateStoreContentAction(prompt: string): Promise<ActionResult<StoreContentResult>> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    enforceRateLimit(`ai-generate:${session.user.merchantId}`, 20, 60 * 60_000);
    const result = await generateStoreContent(storeGenerationPromptSchema.parse(prompt));
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل التوليد' };
  }
}

/**
 * Persists a previously generated draft (see generateStoreContentAction) into
 * the current session's own store — theme/welcome text plus real
 * Category/Product rows. Best-effort per item: one bad category/product
 * doesn't abort the rest, since this only ever adds to an existing store the
 * merchant can freely edit afterward, never overwrites anything.
 */
export async function applyAiStoreContentAction(
  content: StoreContentResult
): Promise<ActionResult<{ categoriesCreated: number; productsCreated: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    const merchantId = session.user.merchantId;
    const safeContent = storeContentSchema.parse(content);

    await saveStorefrontSettingsAction({
      theme: { primaryColor: safeContent.primaryColor } as Prisma.InputJsonValue,
      welcomeText: safeContent.welcomeText,
    });

    let categoriesCreated = 0;
    let productsCreated = 0;
    for (const category of safeContent.categories) {
      try {
        const createdCategory = await categoriesService.createCategory(merchantId, {
          name: category.name,
          sortOrder: 0,
          isActive: true,
        });
        categoriesCreated++;
        for (const product of category.products) {
          try {
            await productsService.createProduct(merchantId, {
              name: product.name,
              categoryId: createdCategory.id,
              price: Math.max(Number(product.price) || 0, 1),
              description: product.description,
              images: [],
              isActive: true,
              isFeatured: false,
              sortOrder: 0,
            });
            productsCreated++;
          } catch (err) {
            console.error('[storefront] AI-apply: failed to create product', product.name, err);
          }
        }
      } catch (err) {
        console.error('[storefront] AI-apply: failed to create category', category.name, err);
      }
    }

    revalidatePath('/dashboard/storefront');
    revalidatePath('/dashboard/products');
    return { success: true, data: { categoriesCreated, productsCreated } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل التطبيق' };
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
