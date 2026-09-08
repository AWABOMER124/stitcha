import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import { AiCoreStoreContentProvider, isAiCoreStoreGenerationConfigured } from '@/services/ai/providers/ai-core-store-content.provider';

export async function POST(_req: Request, { params }: { params: Promise<{ convId: string }> }) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { convId } = await params;

  const conv = await prisma.conversation.findFirst({
    where: { id: convId, merchantId: session.user.merchantId },
    include: { merchant: { select: { name: true } } },
  });
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const messages = await prisma.inboxMessage.findMany({
    where: { conversationId: convId },
    orderBy: { sentAt: 'asc' },
    take: 20,
  });
  if (messages.length === 0) return NextResponse.json({ error: 'No messages yet' }, { status: 400 });

  if (!isAiCoreStoreGenerationConfigured()) return NextResponse.json({ error: 'بوابة الذكاء الاصطناعي الخاصة بوصلة غير مُعدة بعد' }, { status: 503 });

  const transcript = messages
    .map((m) => `${m.isFromCustomer ? 'العميل' : 'المتجر'}: ${m.content}`)
    .join('\n');

  try {
    const result = await new AiCoreStoreContentProvider().askCopilot(
      `أنت مساعد خدمة عملاء لمتجر "${conv.merchant.name}". اقترح رداً عربياً واحداً قصيراً ومهذباً على آخر رسالة للعميل، جاهزاً للإرسال دون Markdown أو شرح. سجل المحادثة:\n${transcript}`,
      { merchantName: conv.merchant.name, transcript },
      { merchantId: session.user.merchantId, actorId: session.user.id, merchantName: conv.merchant.name, language: 'ar' },
    );
    const suggestion = result.answer.trim();
    if (!suggestion) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    return NextResponse.json({ suggestion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate suggestion' }, { status: 500 });
  }
}
