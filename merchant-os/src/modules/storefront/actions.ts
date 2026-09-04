'use server';

import { auth } from '@/lib/auth/config';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { placeOrderSchema } from './schemas/storefront.schemas';
import * as storefrontService from './services/storefront.service';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { generateStoreContentWithMetadata } from '@/services/ai/ai-store-content.service';
import type { StoreContentResult } from '@/services/ai/types';
import { storeContentSchema, storeGenerationPromptSchema } from '@/services/ai/store-content.schema';
import * as categoriesService from '@/modules/categories/services/categories.service';
import * as productsService from '@/modules/products/services/products.service';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { normalizeStorefrontTheme } from '@/lib/storefront-theme';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { AI_FEATURE_KEYS, runMeteredAiOperation } from '@/modules/ai-usage';

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
  logoImage?: string;
  bannerImage?: string | null;
  welcomeText?: string | null;
  isOpen?: boolean;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  minimumOrderAmount?: number;
  socialLinks?: Prisma.InputJsonValue;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authContext = await getAuthContext();
    requirePermission(authContext, 'settings:update');
    const merchant = await prisma.merchant.findUniqueOrThrow({
      where: { id: authContext.merchantId },
      select: { name: true, storefrontSettings: { select: { theme: true } } },
    });
    const { logoImage, theme, ...settingsData } = data;
    const previousTheme = merchant.storefrontSettings?.theme && typeof merchant.storefrontSettings.theme === 'object'
      ? merchant.storefrontSettings.theme as Record<string, unknown>
      : {};
    const incomingTheme = theme && typeof theme === 'object' ? theme as Record<string, unknown> : {};
    const normalizedTheme = theme === undefined
      ? undefined
      : normalizeStorefrontTheme({ ...previousTheme, ...incomingTheme }, merchant.name) as unknown as Prisma.InputJsonValue;
    const safeSettingsData = normalizedTheme === undefined ? settingsData : { ...settingsData, theme: normalizedTheme };
    await prisma.$transaction([
      prisma.storefrontSettings.upsert({
        where: { merchantId: authContext.merchantId },
        update: safeSettingsData,
        create: { merchantId: authContext.merchantId, ...safeSettingsData },
      }),
      ...(logoImage !== undefined
        ? [prisma.merchant.update({
            where: { id: authContext.merchantId },
            data: { logo: logoImage || null },
          })]
        : []),
    ]);
    revalidatePath('/dashboard/storefront');
    revalidatePath('/store', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'حدث خطأ' };
  }
}

/** Generate a draft store (name/content/catalog) from a prompt — preview only, writes nothing. */
export async function generateStoreContentAction(
  prompt: string,
  idempotencyKey?: string,
): Promise<ActionResult<StoreContentResult>> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    const merchantId = session.user.merchantId;
    const [plan, merchant] = await Promise.all([
      getMerchantPlanSnapshot(merchantId),
      prisma.merchant.findUnique({ where: { id: merchantId }, select: { name: true, businessType: true } }),
    ]);
    const usesMonthlyQuota = plan.entitlements.aiStoreGenerationsMonthly !== 0;
    const limit = usesMonthlyQuota
      ? plan.entitlements.aiStoreGenerationsMonthly
      : plan.entitlements.aiStoreGenerationsLifetime;
    const featureKey = usesMonthlyQuota
      ? AI_FEATURE_KEYS.STORE_GENERATION_MONTHLY
      : AI_FEATURE_KEYS.STORE_GENERATION_LIFETIME;
    const requestKey = idempotencyKey?.trim();
    if (requestKey && (requestKey.length < 8 || requestKey.length > 120)) {
      return { success: false, error: 'معرّف طلب التوليد غير صالح' };
    }
    enforceRateLimit(`ai-generate:${merchantId}`, 20, 60 * 60_000);
    const safePrompt = storeGenerationPromptSchema.parse(prompt);
    const result = await runMeteredAiOperation({
      merchantId,
      featureKey,
      period: usesMonthlyQuota ? 'MONTHLY' : 'LIFETIME',
      limit,
      idempotencyKey: requestKey || crypto.randomUUID(),
    }, async () => {
      const generated = await generateStoreContentWithMetadata(safePrompt, {
        merchantId,
        actorId: session.user.id || merchantId,
        merchantName: merchant?.name,
        businessType: merchant?.businessType?.toLowerCase(),
        language: 'ar',
      });
      return { value: generated.content, usage: generated.usage };
    });
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
