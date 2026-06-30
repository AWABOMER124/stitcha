import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured — add ANTHROPIC_API_KEY to env' }, { status: 503 });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `أنت مساعد متخصص في إنشاء متاجر إلكترونية احترافية باللغة العربية. بناءً على الوصف التالي، اقترح محتوى المتجر.

الوصف: ${prompt}

أجب بـ JSON فقط بهذا الشكل بدون أي نص آخر:
{
  "name": "اسم المتجر",
  "description": "وصف قصير وجذاب",
  "slogan": "شعار قصير",
  "primaryColor": "#كود اللون",
  "welcomeText": "رسالة ترحيب للعملاء",
  "categories": [
    {
      "name": "اسم الفئة",
      "products": [
        { "name": "اسم المنتج", "price": 0, "description": "وصف المنتج" }
      ]
    }
  ]
}`,
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ success: true, data: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
