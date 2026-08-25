import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/db/prisma';
import { uniqueSlug } from '@/lib/slug';
import { enqueueExternalNotification } from '@/services/jobs/notification.jobs';
import type { BusinessType, Prisma } from '@prisma/client';

const REGISTRATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreatePendingMerchantInput {
  name: string;
  phone: string;
  address: string;
  distributorId: string;
  businessType?: BusinessType;
  description?: string;
  seedTheme?: { primaryColor?: string; welcomeText?: string };
  seedCategories?: Array<{
    name: string;
    products: Array<{ name: string; price: number; description?: string }>;
  }>;
}

/**
 * Distributor "Add Merchant" — invite-by-link flow. Creates a PENDING
 * merchant plus its main Branch and initial StorefrontSettings, sends a
 * one-time WhatsApp registration link, and (if provided) pre-seeds a
 * catalog. The merchant owner completes their own registration (owner
 * name, password) and verifies their phone via OTP — see
 * /complete-registration/[token] — which is what actually flips the
 * merchant to ACTIVE. Nothing here bypasses that gate.
 *
 * Shared by the manual "Add Merchant" form and the AI-assisted one — both
 * just differ in whether seedTheme/seedCategories are populated.
 */
export async function createPendingMerchantWithInvite(input: CreatePendingMerchantInput): Promise<{ id: string; slug: string }> {
  const registrationToken = randomBytes(24).toString('hex');

  const merchant = await prisma.$transaction(async (tx) => {
    const created = await tx.merchant.create({
      data: {
        name: input.name,
        slug: uniqueSlug(input.name),
        description: input.description,
        phone: input.phone,
        address: input.address,
        businessType: input.businessType ?? 'OTHER',
        storeType: 'ONLINE_STORE',
        status: 'PENDING',
        distributorId: input.distributorId,
        registrationToken,
        registrationTokenExpiresAt: new Date(Date.now() + REGISTRATION_LINK_TTL_MS),
      },
    });

    await tx.branch.create({
      data: {
        merchantId: created.id,
        name: 'Main Branch',
        address: input.address,
        phone: input.phone,
        isMain: true,
      },
    });

    await tx.storefrontSettings.create({
      data: {
        merchantId: created.id,
        ...(input.seedTheme?.primaryColor && { theme: { primaryColor: input.seedTheme.primaryColor } as Prisma.InputJsonValue }),
        ...(input.seedTheme?.welcomeText && { welcomeText: input.seedTheme.welcomeText }),
      },
    });

    for (const [i, category] of (input.seedCategories ?? []).entries()) {
      const createdCategory = await tx.category.create({
        data: {
          merchantId: created.id,
          name: category.name,
          slug: uniqueSlug(category.name),
          sortOrder: i,
        },
      });
      for (const [j, product] of category.products.entries()) {
        const newProduct = await tx.product.create({
          data: {
            merchantId: created.id,
            categoryId: createdCategory.id,
            name: product.name,
            slug: uniqueSlug(product.name),
            description: product.description,
            price: Math.max(Number(product.price) || 0, 1),
            sortOrder: j,
          },
        });
        await tx.inventoryItem.create({
          data: { productId: newProduct.id, merchantId: created.id, quantity: 0, lowStockThreshold: 5 },
        });
      }
    }

    return created;
  });

  const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/complete-registration/${registrationToken}`;
  try {
    await enqueueExternalNotification({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: input.phone,
      title: 'أكمل تسجيل متجرك في وصلك',
      body: `مرحبًا، تمت إضافة متجر "${input.name}" على منصة وصلك. أكمل بياناتك من الرابط التالي (صالح لمدة 7 أيام):\n${registrationUrl}`,
    }, `merchant-invite:${merchant.id}:${createHash('sha256').update(registrationToken).digest('hex')}`);
  } catch (err) {
    console.error('[merchant-invite] Failed to send registration link:', err);
  }

  return { id: merchant.id, slug: merchant.slug };
}
