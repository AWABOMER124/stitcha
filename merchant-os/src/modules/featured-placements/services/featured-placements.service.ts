import { NotFoundError } from '@/lib/errors';
import * as repo from '../repositories/featured-placements.repository';
import type { CreateFeaturedPlacementInput } from '../schemas/featured-placements.schemas';

export async function createFeaturedPlacement(distributorId: string, input: CreateFeaturedPlacementInput) {
  const merchant = await repo.findMerchantForDistributor(input.merchantId, distributorId);
  if (!merchant) throw new NotFoundError('Merchant');
  return repo.createPlacement(distributorId, input);
}

export async function listFeaturedPlacements(distributorId: string) {
  const placements = await repo.listForDistributor(distributorId);
  const now = new Date();
  return placements.map((p) => ({
    ...p,
    isActive: new Date(p.startsAt) <= now && new Date(p.endsAt) >= now,
  }));
}

export async function removeFeaturedPlacement(id: string, distributorId: string) {
  const result = await repo.deletePlacement(id, distributorId);
  if (result.count === 0) throw new NotFoundError('Featured placement');
}
