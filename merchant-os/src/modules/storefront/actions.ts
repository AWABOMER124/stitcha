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
import { AiCoreStoreContentProvider, isAiCoreEnabledForTenant, isAiCoreStoreGenerationConfigured } from '@/services/ai/providers/ai-core-store-content.provider';
import { storeGenerationPromptSchema } from '@/services/ai/store-content.schema';
import * as categoriesService from '@/modules/categories/services/categories.service';
import * as productsService from '@/modules/products/services/products.service';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { normalizeStorefrontTheme } from '@/lib/storefront-theme';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import { AI_FEATURE_KEYS, runMeteredAiOperation } from '@/modules/ai-usage';
import {
  claimAiStoreDraftForApplication,
  failAiStoreDraftApplication,
  finishAiStoreDraftApplication,
  getMerchantAiStoreProjectLink,
  getMerchantAiStoreVersionLink,
  saveAiStoreProjectVersion,
  saveGeneratedAiStoreProject,
  type AiStoreDraft,
} from './services/ai-store-projects.service';

type AiStoreDraftView = Omit<AiStoreDraft, 'createdAt'> & { createdAt: string };

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function draftView(draft: AiStoreDraft): AiStoreDraftView {
  return { ...draft, createdAt: draft.createdAt.toISOString() };
}

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

/** Generate and persist a versioned draft store (name/content/catalog) for preview. */
export async function generateStoreContentAction(
  prompt: string,
  idempotencyKey?: string,
): Promise<ActionResult<AiStoreDraftView>> {
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
    const generated = await runMeteredAiOperation({
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
      return { value: generated, usage: generated.usage };
    });
    const draft = await saveGeneratedAiStoreProject({
      merchantId,
      actorId: session.user.id,
      prompt: safePrompt,
      generated,
    });
    return { success: true, data: draftView(draft) };
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
  versionId: string,
): Promise<ActionResult<{ categoriesCreated: number; productsCreated: number; status: 'APPLIED' | 'PARTIAL' }>> {
  let claimedVersionId: string | undefined;
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    const merchantId = session.user.merchantId;
    const claimed = await claimAiStoreDraftForApplication(merchantId, versionId);
    claimedVersionId = claimed.versionId;
    const safeContent = claimed.content;

    const settingsResult = await saveStorefrontSettingsAction({
      theme: { primaryColor: safeContent.primaryColor } as Prisma.InputJsonValue,
      welcomeText: safeContent.welcomeText,
    });
    if (!settingsResult.success) throw new Error(settingsResult.error || 'فشل حفظ إعدادات المتجر');

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

    const status = await finishAiStoreDraftApplication(claimed.versionId, {
      categoriesCreated,
      productsCreated,
      categoriesRequested: safeContent.categories.length,
      productsRequested: safeContent.categories.reduce((total, category) => total + category.products.length, 0),
    });
    revalidatePath('/dashboard/storefront');
    revalidatePath('/dashboard/storefront/ai');
    revalidatePath('/dashboard/products');
    return { success: true, data: { categoriesCreated, productsCreated, status } };
  } catch (error) {
    if (claimedVersionId) await failAiStoreDraftApplication(claimedVersionId).catch(() => undefined);
    return { success: false, error: error instanceof Error ? error.message : 'فشل التطبيق' };
  }
}

export async function refineAiStoreProjectAction(
  projectId: string,
  prompt: string,
  idempotencyKey?: string,
): Promise<ActionResult<AiStoreDraftView>> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    const merchantId = session.user.merchantId;
    if (!isAiCoreStoreGenerationConfigured() || !isAiCoreEnabledForTenant(merchantId)) return { success: false, error: 'التعديل الذكي غير مفعّل لهذا المتجر بعد' };
    const safePrompt = storeGenerationPromptSchema.parse(prompt);
    const requestKey = idempotencyKey?.trim() || crypto.randomUUID();
    if (requestKey.length < 8 || requestKey.length > 120) return { success: false, error: 'معرّف طلب التعديل غير صالح' };
    enforceRateLimit(`ai-store-edit:${merchantId}`, 30, 60 * 60_000);
    const [plan, link] = await Promise.all([
      getMerchantPlanSnapshot(merchantId),
      getMerchantAiStoreProjectLink(merchantId, projectId),
    ]);
    const generated = await runMeteredAiOperation({
      merchantId,
      featureKey: AI_FEATURE_KEYS.STORE_EDIT_MONTHLY,
      period: 'MONTHLY',
      limit: plan.entitlements.aiStoreEditsMonthly,
      idempotencyKey: requestKey,
    }, async () => {
      const result = await new AiCoreStoreContentProvider().refine(link.gatewayProjectId, safePrompt, {
        merchantId,
        actorId: session.user.id || merchantId,
        language: 'ar',
      });
      return {
        value: result,
        usage: {
          provider: 'ai-core', providerRequestId: result.requestId,
          metadata: { projectId: result.projectId, versionId: result.versionId, versionNumber: result.versionNumber },
        },
      };
    });
    const draft = await saveAiStoreProjectVersion({
      merchantId,
      projectId: link.projectId,
      gatewayVersionId: generated.versionId,
      versionNumber: generated.versionNumber,
      content: generated.content,
    });
    revalidatePath('/dashboard/storefront/ai');
    return { success: true, data: draftView(draft) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل تعديل المتجر' };
  }
}

export async function restoreAiStoreVersionAction(versionId: string): Promise<ActionResult<AiStoreDraftView>> {
  try {
    const session = await auth();
    if (!session?.user?.merchantId) return { success: false, error: 'غير مصرح' };
    const merchantId = session.user.merchantId;
    if (!isAiCoreStoreGenerationConfigured() || !isAiCoreEnabledForTenant(merchantId)) return { success: false, error: 'استعادة الإصدارات غير مفعّلة لهذا المتجر بعد' };
    enforceRateLimit(`ai-store-restore:${merchantId}`, 30, 60 * 60_000);
    const link = await getMerchantAiStoreVersionLink(merchantId, versionId);
    const restored = await new AiCoreStoreContentProvider().restore(link.gatewayProjectId, link.gatewayVersionId, {
      merchantId,
      actorId: session.user.id || merchantId,
      language: 'ar',
    });
    const draft = await saveAiStoreProjectVersion({
      merchantId,
      projectId: link.projectId,
      gatewayVersionId: restored.versionId,
      versionNumber: restored.versionNumber,
      content: restored.content,
    });
    revalidatePath('/dashboard/storefront/ai');
    return { success: true, data: draftView(draft) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل استعادة الإصدار' };
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
