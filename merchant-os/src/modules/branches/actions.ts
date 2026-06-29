'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as branchesService from './services/branches.service';
import { createBranchSchema, updateBranchSchema } from './schemas/branches.schemas';
import type { ActionResult } from '@/lib/types';
import type { Branch } from '@prisma/client';

// ============================================================================
// Branches Module — Server Actions
// ============================================================================

/** List all branches */
export async function getBranchesAction(): Promise<ActionResult<Branch[]>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:read');
    const branches = await branchesService.getBranches(auth.merchantId);
    return { success: true, data: branches as unknown as Branch[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get branches' };
  }
}

/** Get a single branch */
export async function getBranchAction(id: string): Promise<ActionResult<Branch>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:read');
    const branch = await branchesService.getBranch(auth.merchantId, id);
    return { success: true, data: branch as unknown as Branch };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get branch' };
  }
}

/** Create a new branch */
export async function createBranchAction(formData: unknown): Promise<ActionResult<Branch>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:create');
    const parsed = createBranchSchema.parse(formData);
    const branch = await branchesService.createBranch(auth.merchantId, parsed);
    return { success: true, data: branch as unknown as Branch };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create branch' };
  }
}

/** Update a branch */
export async function updateBranchAction(id: string, formData: unknown): Promise<ActionResult<Branch>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:update');
    const parsed = updateBranchSchema.parse(formData);
    const branch = await branchesService.updateBranch(auth.merchantId, id, parsed);
    return { success: true, data: branch as unknown as Branch };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update branch' };
  }
}

/** Delete a branch */
export async function deleteBranchAction(id: string): Promise<ActionResult<Branch>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:delete');
    const branch = await branchesService.deleteBranch(auth.merchantId, id);
    return { success: true, data: branch };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete branch' };
  }
}

/** Set a branch as main */
export async function setMainBranchAction(id: string): Promise<ActionResult<Branch>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'branches:update');
    const branch = await branchesService.setMainBranch(auth.merchantId, id);
    return { success: true, data: branch as unknown as Branch };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to set main branch' };
  }
}
