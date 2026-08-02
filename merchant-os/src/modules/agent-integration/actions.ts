'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as service from './services/agent-integration.service';
import {
  createApiKeySchema,
  approveStoreDraftSchema,
  rejectStoreDraftSchema,
  type CreateApiKeyInput,
  type ApproveStoreDraftInput,
} from './schemas/agent-integration.schemas';
import type { ActionResult } from '@/lib/types';

interface DistributorContext {
  distributorId: string;
  userId: string;
}

async function getDistributorContext(): Promise<DistributorContext> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  return { distributorId: session.user.distributorId, userId: session.user.id };
}

async function requireDistributorAdmin(): Promise<DistributorContext> {
  const ctx = await getDistributorContext();
  const session = await auth();
  const role = session?.user?.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/distributor/dashboard');
  return ctx;
}

function toResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  return fn()
    .then((data) => ({ success: true as const, data }))
    .catch((e) => ({ success: false as const, error: e instanceof Error ? e.message : 'Failed' }));
}

// ── API keys ─────────────────────────────────────────────────────────────

export async function listApiKeysAction() {
  const { distributorId } = await getDistributorContext();
  return toResult(() => service.listApiKeys(distributorId));
}

export async function createApiKeyAction(input: CreateApiKeyInput) {
  const { distributorId } = await requireDistributorAdmin();
  return toResult(async () => {
    const parsed = createApiKeySchema.parse(input);
    return service.issueApiKey(distributorId, parsed);
  });
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult<null>> {
  const { distributorId } = await requireDistributorAdmin();
  return toResult(async () => {
    await service.revokeApiKey(id, distributorId);
    return null;
  });
}

// ── Store drafts ─────────────────────────────────────────────────────────

export async function listStoreDraftsAction() {
  const { distributorId } = await getDistributorContext();
  return toResult(() => service.listStoreDrafts(distributorId));
}

export async function approveStoreDraftAction(id: string, input: ApproveStoreDraftInput) {
  const { distributorId, userId } = await requireDistributorAdmin();
  return toResult(async () => {
    const parsed = approveStoreDraftSchema.parse(input);
    return service.approveStoreDraft(id, distributorId, userId, parsed);
  });
}

export async function rejectStoreDraftAction(id: string, reason?: string) {
  const { distributorId, userId } = await requireDistributorAdmin();
  return toResult(async () => {
    const parsed = rejectStoreDraftSchema.parse({ reason });
    return service.rejectStoreDraft(id, distributorId, userId, parsed.reason);
  });
}
