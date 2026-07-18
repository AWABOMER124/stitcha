import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { InboxClient } from './_client';

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const conversations = await prisma.conversation.findMany({
    where: { merchantId: session.user.merchantId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
  });

  return <InboxClient conversations={conversations} />;
}
