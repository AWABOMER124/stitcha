import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { InboxClient } from './_client';

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  let conversations: any[] = [];
  try {
    const prisma = (await import('@/lib/db/prisma')).default;
    conversations = await (prisma as any).conversation.findMany({
      where: { merchantId: session.user.merchantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
    });
  } catch {}

  return <InboxClient conversations={conversations} merchantId={session.user.merchantId} />;
}
