import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeStoreContentProvider } from './claude.provider';

const originalFetch = global.fetch;
const originalKey = process.env.ANTHROPIC_API_KEY;

describe('ClaudeStoreContentProvider', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const provider = new ClaudeStoreContentProvider();
    await expect(provider.generate('a coffee shop')).rejects.toThrow('AI not configured');
  });

  it('parses a valid JSON response embedded in the model text', async () => {
    const payload = {
      name: 'قهوة الصباح', description: 'مقهى', slogan: 'شعار', primaryColor: '#ff0000', welcomeText: 'أهلاً',
      categories: [{ name: 'مشروبات', products: [{ name: 'قهوة', price: 10, description: 'ساخنة' }] }],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: `here you go:\n${JSON.stringify(payload)}\nenjoy` }] }),
    }) as unknown as typeof fetch;

    const provider = new ClaudeStoreContentProvider();
    const result = await provider.generate('a coffee shop');
    expect(result).toEqual(payload);
  });

  it('sends the API key and prompt to the Anthropic endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: '{"name":"x","description":"x","slogan":"x","primaryColor":"#000000","welcomeText":"x","categories":[]}' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await new ClaudeStoreContentProvider().generate('محل ملابس');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('محل ملابس');
  });

  it('throws a BusinessRuleError when the HTTP call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const provider = new ClaudeStoreContentProvider();
    await expect(provider.generate('anything')).rejects.toThrow('AI request failed (500)');
  });

  it('throws when the model response has no JSON object', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'sorry, I cannot help with that' }] }),
    }) as unknown as typeof fetch;
    const provider = new ClaudeStoreContentProvider();
    await expect(provider.generate('anything')).rejects.toThrow('Invalid AI response');
  });
});
