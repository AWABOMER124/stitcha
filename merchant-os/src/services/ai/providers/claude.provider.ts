import { BusinessRuleError } from '@/lib/errors';
import type { StoreContentProvider, StoreContentResult } from '../types';
import { storeContentSchema } from '../store-content.schema';

export class ClaudeStoreContentProvider implements StoreContentProvider {
  async generate(prompt: string): Promise<StoreContentResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new BusinessRuleError('AI not configured — add ANTHROPIC_API_KEY to env');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [
          {
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
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new BusinessRuleError(`AI request failed (${res.status})`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new BusinessRuleError('Invalid AI response');

    try {
      return storeContentSchema.parse(JSON.parse(match[0]));
    } catch {
      throw new BusinessRuleError('AI returned invalid store content');
    }
  }
}
