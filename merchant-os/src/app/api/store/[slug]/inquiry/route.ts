import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { customerName, customerPhone, message, merchantId } = await req.json();
    if (!customerName || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const id = merchantId ?? (await prisma.merchant.findUnique({ where: { slug }, select: { id: true } }))?.id;
    if (!id) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const conv = await prisma.conversation.create({
      data: {
        merchantId: id,
        customerName,
        customerPhone: customerPhone ?? null,
        channel: 'WEB',
        status: 'OPEN',
        messages: {
          create: { content: message, isFromCustomer: true, senderName: customerName },
        },
      },
    }).catch(() => null);

    return NextResponse.json({ success: true, conversationId: conv?.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to submit inquiry' }, { status: 500 });
  }
}
