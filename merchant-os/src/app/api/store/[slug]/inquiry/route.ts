import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

const inquirySchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z.string().trim().min(7).max(32).optional(),
  message: z.string().trim().min(1).max(2000),
}).strict();

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!checkRateLimit(`store-inquiry:${slug}:${getClientIp(req)}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
    }

    const parsed = inquirySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid inquiry data' }, { status: 400 });
    }
    const { customerName, customerPhone, message } = parsed.data;

    const id = (await prisma.merchant.findUnique({
      where: { slug, isActive: true, status: 'ACTIVE' },
      select: { id: true },
    }))?.id;
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

    if (!conv) return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
    return NextResponse.json({ success: true, conversationId: conv.id });
  } catch {
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}
