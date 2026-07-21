import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { ApprovalsClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const pendingMerchants = await prisma.merchant.findMany({
    where: { distributorId: session.user.distributorId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      storeType: true,
      createdAt: true,
      registrationTokenExpiresAt: true,
    },
  });

  // Server Component: rendered once per request, so Date.now() here is not memoization-sensitive.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const initialMerchants = pendingMerchants.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    isExpired: !!m.registrationTokenExpiresAt && m.registrationTokenExpiresAt.getTime() < now,
  }));

  return <ApprovalsClient initialMerchants={initialMerchants} />;
}
