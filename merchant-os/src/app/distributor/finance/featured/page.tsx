import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { getFeaturedPlacementsAction } from '@/modules/featured-placements/actions';
import { FeaturedPlacementsClient, type PlacementListItem, type MerchantOption } from './_client';

export const dynamic = 'force-dynamic';

export default async function FeaturedPlacementsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const [placementsResult, merchants] = await Promise.all([
    getFeaturedPlacementsAction(),
    prisma.merchant.findMany({
      where: { distributorId: session.user.distributorId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const placements = (placementsResult.success ? placementsResult.data : []) as unknown as PlacementListItem[];

  return <FeaturedPlacementsClient initialPlacements={placements} merchants={merchants as MerchantOption[]} />;
}
