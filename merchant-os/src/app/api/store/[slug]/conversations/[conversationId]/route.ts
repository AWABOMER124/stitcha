import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { hashConversationToken, readConversationToken } from '@/lib/security/public-conversation';

const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) }).strict();
type Context = { params: Promise<{ slug: string; conversationId: string }> };

async function getConversation(request: Request, context: Context) {
  const token = readConversationToken(request);
  if (!token) return null;
  const { slug, conversationId } = await context.params;
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      publicTokenHash: hashConversationToken(token),
      channel: 'WEB',
      merchant: { slug, isActive: true, status: 'ACTIVE' },
    },
    select: { id: true, status: true, customerName: true },
  });
}

export async function GET(request: NextRequest, context: Context) {
  const conversation = await getConversation(request, context);
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const [messages] = await prisma.$transaction([
    prisma.inboxMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      select: { id: true, content: true, isFromCustomer: true, senderName: true, sentAt: true, readAt: true },
    }),
    prisma.inboxMessage.updateMany({
      where: { conversationId: conversation.id, isFromCustomer: false, readAt: null },
      data: { readAt: new Date() },
    }),
  ]);
  return NextResponse.json({ conversation, messages });
}

export async function POST(request: NextRequest, context: Context) {
  const { slug, conversationId } = await context.params;
  if (!checkRateLimit(`store-conversation:${slug}:${conversationId}:${getClientIp(request)}`, 30, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
  }
  const conversation = await getConversation(request, { params: Promise.resolve({ slug, conversationId }) });
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });

  const message = await prisma.inboxMessage.create({
    data: {
      conversationId: conversation.id,
      content: parsed.data.message,
      isFromCustomer: true,
      senderName: conversation.customerName,
    },
  });
  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: 'OPEN', updatedAt: new Date() },
    select: { merchantId: true },
  });
  await prisma.notificationLog.create({
    data: {
      merchantId: updated.merchantId,
      type: 'SYSTEM',
      channel: 'IN_APP',
      recipient: updated.merchantId,
      title: 'رد جديد من عميل',
      body: parsed.data.message.slice(0, 140),
      metadata: { kind: 'STORE_MESSAGE', conversationId: conversation.id },
      idempotencyKey: `store-message:${message.id}`,
    },
  }).catch(() => null);
  return NextResponse.json({ message });
}
