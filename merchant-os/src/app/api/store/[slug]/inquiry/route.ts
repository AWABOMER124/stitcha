import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { customerName, customerPhone, message, merchantId } = await req.json();
    if (!customerName || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const id = merchantId ?? (await prisma.merchant.findUnique({ where: { slug }, select: { id: true } }))?.id;
    if (!id) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const conv = await (prisma as any).conversation.create({
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
