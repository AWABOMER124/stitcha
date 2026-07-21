import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: convId, merchantId: session.user.merchantId },
      select: { id: true },
    });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const messages = await prisma.inboxMessage.findMany({
      where: { conversationId: convId },
      orderBy: { sentAt: 'asc' },
    });
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
