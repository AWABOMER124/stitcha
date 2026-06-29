import { NotFoundError, BusinessRuleError } from '@/lib/errors';
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
  return branchesRepo.create(merchantId, data);
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
