import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProductImagePrompt, OpenAiProductImageProvider } from './openai-product-image.provider';

describe('OpenAI product image provider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_IMAGE_MODEL;
  });

  it('builds a high-fidelity white-studio edit request', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from('enhanced').toString('base64') }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await new OpenAiProductImageProvider().enhance(Buffer.from('source'), { mode: 'CLEAN_WHITE', scene: '' });
    expect(result).toMatchObject({ mimeType: 'image/webp', filename: 'product-enhanced.webp' });
    expect(result.buffer.toString()).toBe('enhanced');
    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('https://api.openai.com/v1/images/edits');
    const form = (request[1] as RequestInit).body as FormData;
    expect(form.get('model')).toBe('gpt-image-2');
    expect(form.get('background')).toBe('opaque');
    expect(form.get('prompt')).toContain('Preserve the exact product identity');
  });

  it('requests PNG output for a transparent background', () => {
    const prompt = buildProductImagePrompt({ mode: 'TRANSPARENT', scene: '' });
    expect(prompt).toContain('remove only the existing background');
    expect(prompt).toContain('transparent background');
  });

  it('requires server-side provider configuration', async () => {
    await expect(new OpenAiProductImageProvider().enhance(Buffer.from('source'), { mode: 'LIFESTYLE', scene: 'a kitchen' }))
      .rejects.toThrow('not configured');
  });
});
