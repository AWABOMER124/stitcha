'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import * as service from './services/featured-placements.service';
import { createFeaturedPlacementSchema } from './schemas/featured-placements.schemas';
import type { ActionResult } from '@/lib/types';

async function getDistributorId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') redirect('/dashboard');
  return session.user.distributorId;
}

export async function getFeaturedPlacementsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const distributorId = await getDistributorId();
    const data = await service.listFeaturedPlacements(distributorId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function createFeaturedPlacementAction(input: unknown): Promise<ActionResult<unknown>> {
  try {
    const distributorId = await getDistributorId();
    const parsed = createFeaturedPlacementSchema.parse(input);
    const data = await service.createFeaturedPlacement(distributorId, parsed);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function removeFeaturedPlacementAction(id: string): Promise<ActionResult<null>> {
  try {
    const distributorId = await getDistributorId();
    await service.removeFeaturedPlacement(id, distributorId);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
