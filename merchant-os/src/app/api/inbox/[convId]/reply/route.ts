import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  try {
    const message = await (prisma as any).inboxMessage.create({
      data: { conversationId: convId, content, isFromCustomer: false, senderName: 'المتجر' },
    });
    await (prisma as any).conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });
    return NextResponse.json({ message });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
