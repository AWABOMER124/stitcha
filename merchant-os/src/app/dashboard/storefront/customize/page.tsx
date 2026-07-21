import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { CustomizeClient, type Settings } from './_client';

export default async function CustomizePage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const merchant = await prisma.merchant.findUnique({
    where: { id: session.user.merchantId },
    include: { storefrontSettings: true },
  });

  return <CustomizeClient settings={(merchant?.storefrontSettings as unknown as Settings) ?? null} slug={merchant?.slug ?? ''} />;
}
