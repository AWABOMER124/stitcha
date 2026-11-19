import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { InboxClient } from './_client';

export default async function InboxPage({searchParams}:{searchParams:Promise<{conversation?:string}>}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const conversations = await prisma.conversation.findMany({
    where: { merchantId: session.user.merchantId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { isFromCustomer: true, readAt: null } } } },
    },
  });

  const {conversation}=await searchParams;
  return <InboxClient key={conversation||"all"} conversations={conversations} initialConversationId={conversation} />;
}
