import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured — add ANTHROPIC_API_KEY to env' }, { status: 503 });

  const transcript = messages
    .map((m) => `${m.isFromCustomer ? 'العميل' : 'المتجر'}: ${m.content}`)
    .join('\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `أنت مساعد خدمة عملاء لمتجر "${conv.merchant.name}" على منصة واصلك. اقرأ سجل المحادثة التالي واقترح رداً واحداً مناسباً ومهذباً باللغة العربية على آخر رسالة من العميل. الرد يجب أن يكون قصيراً ومباشراً وجاهزاً للإرسال كما هو دون أي تنسيق إضافي.

سجل المحادثة:
${transcript}

أجب بنص الرد المقترح فقط، بدون أي شرح أو علامات اقتباس.`,
        }],
      }),
    });

    const data = await res.json();
    const suggestion = data.content?.[0]?.text?.trim();
    if (!suggestion) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    return NextResponse.json({ suggestion });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate suggestion' }, { status: 500 });
  }
}
