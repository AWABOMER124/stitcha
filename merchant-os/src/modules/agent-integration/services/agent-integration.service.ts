import { randomBytes } from 'crypto';
import prisma from '@/lib/db/prisma';
import { uniqueSlug } from '@/lib/slug';
import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import { serializePrismaArray, serializePrismaObject } from '@/lib/serialization';
import { generateApiKey } from '@/lib/auth/agent-auth';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';
import { mapOrderStatusForApp } from '@/modules/storefront/services/storefront.service';
import * as repo from '../repositories/agent-integration.repository';
import type { SubmitStoreDraftInput, ApproveStoreDraftInput, CreateApiKeyInput } from '../schemas/agent-integration.schemas';

const REGISTRATION_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // matches /api/distributor/merchants
const whatsAppProvider = new WhatsAppProvider();

// ============================================================================
// Store drafts — submitted by the agent, reviewed by the distributor
// ============================================================================

export async function createStoreDraft(distributorId: string, apiKeyId: string, input: SubmitStoreDraftInput) {
  const draft = await repo.createStoreDraft({
    distributorId,
    apiKeyId,
    prompt: input.prompt,
    name: input.name,
    description: input.description,
    slogan: input.slogan,
    primaryColor: input.primaryColor,
    welcomeText: input.welcomeText,
    categories: input.categories,
  });
  return serializePrismaObject(draft);
}

export async function getStoreDraft(id: string, distributorId: string) {
  const draft = await repo.findDraftById(id, distributorId);
  if (!draft) throw new NotFoundError('Store draft');
  return serializePrismaObject(draft);
}

export async function listStoreDrafts(distributorId: string) {
  const drafts = await repo.listDraftsForDistributor(distributorId);
  return serializePrismaArray(drafts);
}

/**
 * Approving a draft creates the real Merchant the same way the distributor's
 * manual "Add Merchant" flow does (see /api/distributor/merchants): a
 * PENDING merchant plus a WhatsApp registration link, no password set yet.
 * The AI-drafted categories/products are pre-created against that merchant
 * so they're already there once the owner finishes onboarding.
 */
export async function approveStoreDraft(
  draftId: string,
  distributorId: string,
  reviewedById: string,
  input: ApproveStoreDraftInput
) {
  const draft = await repo.findDraftById(draftId, distributorId);
  if (!draft) throw new NotFoundError('Store draft');
  if (draft.status !== 'PENDING') throw new BusinessRuleError('Draft has already been reviewed');

  const registrationToken = randomBytes(24).toString('hex');
  const categories = draft.categories as Array<{
    name: string;
    products: Array<{ name: string; price: number; description?: string }>;
  }>;

  const merchant = await prisma.$transaction(async (tx) => {
    const created = await tx.merchant.create({
      data: {
        name: draft.name,
        slug: uniqueSlug(draft.name),
        description: draft.description,
        phone: input.phone,
        address: input.address,
        businessType: 'OTHER',
        storeType: 'ONLINE_STORE',
        status: 'PENDING',
        distributorId,
        registrationToken,
        registrationTokenExpiresAt: new Date(Date.now() + REGISTRATION_LINK_TTL_MS),
      },
    });

    for (const [i, category] of categories.entries()) {
      const createdCategory = await tx.category.create({
        data: {
          merchantId: created.id,
          name: category.name,
          slug: uniqueSlug(category.name),
          sortOrder: i,
        },
      });
      for (const [j, product] of category.products.entries()) {
        await tx.product.create({
          data: {
            merchantId: created.id,
            categoryId: createdCategory.id,
            name: product.name,
            slug: uniqueSlug(product.name),
            description: product.description,
            price: product.price,
            sortOrder: j,
          },
        });
      }
    }

    return created;
  });

  const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/complete-registration/${registrationToken}`;
  try {
    await whatsAppProvider.send({
      type: 'SYSTEM',
      channel: 'WHATSAPP',
      recipient: input.phone,
      title: 'أكمل تسجيل متجرك في وصلك',
      body: `مرحبًا، تمت إضافة متجر "${draft.name}" على منصة وصلك. أكمل بياناتك من الرابط التالي (صالح لمدة 7 أيام):\n${registrationUrl}`,
    });
  } catch (err) {
    console.error('[agent-integration] Failed to send registration link:', err);
  }

  await repo.markDraftApproved(draftId, merchant.id, reviewedById);
  return serializePrismaObject({ id: merchant.id, slug: merchant.slug });
}

export async function rejectStoreDraft(draftId: string, distributorId: string, reviewedById: string, reason?: string) {
  const draft = await repo.findDraftById(draftId, distributorId);
  if (!draft) throw new NotFoundError('Store draft');
  if (draft.status !== 'PENDING') throw new BusinessRuleError('Draft has already been reviewed');

  const updated = await repo.markDraftRejected(draftId, reviewedById, reason);
  return serializePrismaObject(updated);
}

// ============================================================================
// Read-only "other tasks" — merchant portfolio + order status, scoped to
// the distributor that issued the API key.
// ============================================================================

export async function listDistributorMerchants(distributorId: string) {
  const merchants = await repo.listMerchantsForDistributor(distributorId);
  return serializePrismaArray(merchants);
}

export async function getMerchantOrderSummary(merchantId: string, distributorId: string) {
  const merchant = await repo.findMerchantForDistributor(merchantId, distributorId);
  if (!merchant) throw new NotFoundError('Merchant');

  const counts = await repo.getOrderStatusCounts(merchantId);
  const summary: Record<string, number> = { pending: 0, preparing: 0, delivering: 0, completed: 0, cancelled: 0 };
  for (const row of counts) {
    const bucket = mapOrderStatusForApp(row.status);
    summary[bucket] = (summary[bucket] ?? 0) + row._count._all;
  }
  return summary;
}

// ============================================================================
// API key issuance — distributor-session-authed, not agent-authed.
// ============================================================================

export async function issueApiKey(distributorId: string, input: CreateApiKeyInput) {
  const { raw, hash, prefix } = generateApiKey();
  const key = await repo.createApiKey({
    distributorId,
    name: input.name,
    scopes: input.scopes,
    keyHash: hash,
    keyPrefix: prefix,
  });
  // `raw` is returned exactly once — the DB only ever holds its hash from here on.
  return { id: key.id, name: key.name, scopes: key.scopes, key: raw, createdAt: key.createdAt };
}

export async function listApiKeys(distributorId: string) {
  return repo.listApiKeysForDistributor(distributorId);
}

export async function revokeApiKey(id: string, distributorId: string) {
  const result = await repo.revokeApiKey(id, distributorId);
  if (result.count === 0) throw new NotFoundError('API key');
}
