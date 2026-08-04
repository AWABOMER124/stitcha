'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import * as service from './services/ai-store-generator.service';
import { generateContentSchema, createMerchantFromAiSchema } from './schemas/ai-store-generator.schemas';
import type { ActionResult } from '@/lib/types';
import type { StoreContentResult } from '@/services/ai/types';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/distributor/dashboard');
  return session.user.distributorId;
}

/** Generate a draft store from a prompt for review before creating it — preview only, writes nothing. */
export async function generateStoreContentForDistributorAction(input: unknown): Promise<ActionResult<StoreContentResult>> {
  try {
    const distributorId = await getDistributorId();
    const { prompt } = generateContentSchema.parse(input);
    // Costs a real AI API call — no review step downstream absorbs runaway usage anymore.
    enforceRateLimit(`ai-generate:${distributorId}`, 20, 60 * 60_000);
    const data = await service.generateContentForDistributor(prompt);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to generate store content' };
  }
}

/** Creates a real merchant directly from AI-generated content — no draft, no human review. */
export async function createMerchantFromAiAction(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createMerchantFromAiSchema.parse(input);
    // Tighter than generation — this one sends a real WhatsApp message to a
    // real phone number with zero human review in between.
    enforceRateLimit(`ai-create-merchant:${distributorId}`, 10, 60 * 60_000);
    const data = await service.createMerchantFromAiContent(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create merchant' };
  }
}
