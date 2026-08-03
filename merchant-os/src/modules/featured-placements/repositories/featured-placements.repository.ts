import prisma from '@/lib/db/prisma';
import { serializePrismaArray } from '@/lib/serialization';
import type { CreateFeaturedPlacementInput } from '../schemas/featured-placements.schemas';

export function findMerchantForDistributor(merchantId: string, distributorId: string) {
  return prisma.merchant.findFirst({ where: { id: merchantId, distributorId }, select: { id: true, name: true } });
}

export async function createPlacement(distributorId: string, input: CreateFeaturedPlacementInput) {
  const placement = await prisma.$transaction(async (tx) => {
    const created = await tx.featuredPlacement.create({
      data: {
        distributorId,
        merchantId: input.merchantId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        amount: input.amount,
        notes: input.notes,
      },
      include: { merchant: { select: { id: true, name: true } } },
    });

    await tx.financialTransaction.create({
      data: {
        distributorId,
        merchantId: input.merchantId,
        type: 'FEATURED_PLACEMENT_FEE',
        direction: 'CREDIT',
        amount: input.amount,
        description: `Featured placement ${created.startsAt.toISOString().slice(0, 10)} → ${created.endsAt.toISOString().slice(0, 10)}`,
        reference: created.id,
      },
    });

    return created;
  });

  return placement;
}

export async function listForDistributor(distributorId: string) {
  const placements = await prisma.featuredPlacement.findMany({
    where: { distributorId },
    include: { merchant: { select: { id: true, name: true, slug: true } } },
    orderBy: { startsAt: 'desc' },
  });
  return serializePrismaArray(placements);
}

export function deletePlacement(id: string, distributorId: string) {
  return prisma.featuredPlacement.deleteMany({ where: { id, distributorId } });
}

/** Merchant ids with a currently-active (now between startsAt/endsAt) placement. */
export async function findActiveMerchantIds(now: Date = new Date()): Promise<Set<string>> {
  const active = await prisma.featuredPlacement.findMany({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    select: { merchantId: true },
  });
  return new Set(active.map((p) => p.merchantId));
}
