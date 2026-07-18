import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { DistributorHomeClient } from './_client';

export default async function DistributorDashboardPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const distributorId = session.user.distributorId;

  const [distributor, merchantCount, activeMerchantCount] = await Promise.all([
    prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { name: true, slug: true, status: true },
    }),
    prisma.merchant.count({ where: { distributorId } }),
    prisma.merchant.count({ where: { distributorId, status: 'ACTIVE' } }),
  ]);

  if (!distributor) redirect('/login');

  return (
    <DistributorHomeClient
      distributorName={distributor.name}
      merchantCount={merchantCount}
      activeMerchantCount={activeMerchantCount}
    />
  );
}
