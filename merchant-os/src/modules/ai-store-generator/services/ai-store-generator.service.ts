import { createPendingMerchantWithInvite } from '@/modules/merchants/services/merchant-invite.service';
import { generateStoreContent } from '@/services/ai/ai-store-content.service';
import type { StoreContentResult } from '@/services/ai/types';
import type { CreateMerchantFromAiInput } from '../schemas/ai-store-generator.schemas';

/** Generates a draft store from a prompt — preview only, writes nothing. */
export async function generateContentForDistributor(prompt: string): Promise<StoreContentResult> {
  return generateStoreContent(prompt);
}

/**
 * Creates a real merchant directly from AI-generated content — no draft, no
 * review step. Real phone/address (which the AI cannot invent) are what the
 * distributor supplies alongside the generated content; full activation
 * still goes through the existing PENDING -> WhatsApp link -> phone OTP ->
 * ACTIVE pipeline (see createPendingMerchantWithInvite), unchanged.
 */
export async function createMerchantFromAiContent(
  distributorId: string,
  input: CreateMerchantFromAiInput
): Promise<{ id: string; slug: string }> {
  return createPendingMerchantWithInvite({
    name: input.content.name,
    phone: input.phone,
    address: input.address,
    distributorId,
    businessType: input.businessType,
    description: input.content.description,
    seedTheme: { primaryColor: input.content.primaryColor, welcomeText: input.content.welcomeText },
    seedCategories: input.content.categories,
  });
}
