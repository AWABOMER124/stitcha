import { NotFoundError, BusinessRuleError } from '@/lib/errors';
import prisma from '@/lib/db/prisma';
import { getMerchantPlanSnapshot } from '@/modules/merchant-subscriptions';
import * as branchesRepo from '../repositories/branches.repository';
import type { CreateBranchInput, UpdateBranchInput } from '../schemas/branches.schemas';

// ============================================================================
// Branches Service — Business logic
// ============================================================================

/** Get all branches for a merchant */
export async function getBranches(merchantId: string) {
  return branchesRepo.findAll(merchantId);
}

/** Get a single branch by ID */
export async function getBranch(merchantId: string, id: string) {
  const branch = await branchesRepo.findById(merchantId, id);
  if (!branch) throw new NotFoundError('Branch', id);
  return branch;
}

/** Create a new branch */
export async function createBranch(merchantId: string, data: CreateBranchInput) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'branches:' + merchantId}))`;
    const plan = await getMerchantPlanSnapshot(merchantId, new Date(), tx);
    const current = await tx.branch.count({ where: { merchantId } });
    if (plan.entitlements.maxBranches !== -1 && current >= plan.entitlements.maxBranches) {
      throw new BusinessRuleError(`باقتك تسمح بعدد ${plan.entitlements.maxBranches} من الفروع. رقِّ إلى Pro لإضافة فروع أخرى.`);
    }
    return tx.branch.create({
      data: { merchantId, ...data },
      include: { _count: { select: { merchantUsers: true } } },
    });
  });
}

/** Update an existing branch */
export async function updateBranch(merchantId: string, id: string, data: UpdateBranchInput) {
  await getBranch(merchantId, id);
  return branchesRepo.update(merchantId, id, data);
}

/** Delete a branch — main branches cannot be deleted */
export async function deleteBranch(merchantId: string, id: string) {
  const branch = await getBranch(merchantId, id);
  if (branch.isMain) {
    throw new BusinessRuleError('Cannot delete the main branch. Set another branch as main first.');
  }
  return branchesRepo.remove(merchantId, id);
}

/** Set a branch as the main branch */
export async function setMainBranch(merchantId: string, id: string) {
  await getBranch(merchantId, id);
  const [, updated] = await branchesRepo.setMain(merchantId, id);
  return updated;
}
