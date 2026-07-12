import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { sendMessage } from '@/modules/whatsapp-channel/services/whatsapp-channel.service';

export async function POST(req: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { convId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  try {
    const conv = await (prisma as any).conversation.findFirst({
      where: { id: convId, merchantId: session.user.merchantId },
      select: { id: true, channel: true, customerPhone: true },
    });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    let deliveryError: string | undefined;
    if (conv.channel === 'WHATSAPP') {
      if (!conv.customerPhone) {
        deliveryError = 'لا يوجد رقم هاتف مسجّل لهذه المحادثة';
      } else {
        const result = await sendMessage(session.user.merchantId, conv.customerPhone, content);
        if (!result.success) deliveryError = result.error;
      }
    }

    const message = await (prisma as any).inboxMessage.create({
      data: { conversationId: convId, content, isFromCustomer: false, senderName: 'المتجر' },
    });
    await (prisma as any).conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });
    return NextResponse.json({ message, deliveryError });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
