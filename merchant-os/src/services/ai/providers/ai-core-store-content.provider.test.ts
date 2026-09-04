import { afterEach, describe, expect, it, vi } from 'vitest';
import { jwtVerify } from 'jose';
import { AiCoreStoreContentProvider } from './ai-core-store-content.provider';

const validPayload = {
  name: 'متجر البن',
  description: 'قهوة مختصة',
  slogan: 'قهوتك كما تحب',
  primaryColor: '#13C4A3',
  welcomeText: 'أهلاً بك',
  categories: [{ name: 'القهوة', products: [{ name: 'بن سوداني', price: 2500, description: 'طازج' }] }],
};

describe('AI Core store content provider', () => {
  afterEach(() => {
    delete process.env.AI_CORE_BASE_URL;
    delete process.env.AI_CORE_SECRET_WASLA;
    delete process.env.AI_CORE_TIMEOUT_MS;
    vi.unstubAllGlobals();
  });

  it('signs a short-lived tenant JWT and validates the generated project', async () => {
    process.env.AI_CORE_BASE_URL = 'https://ai.example.test/';
    process.env.AI_CORE_SECRET_WASLA = 'a-secure-test-secret';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok', request_id: 'request_1', project_id: 'project_1', version_id: 'version_1',
      version_number: 1, payload: validPayload, validation_errors: [],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new AiCoreStoreContentProvider().generate('متجر قهوة', {
      merchantId: 'merchant_1', actorId: 'user_1', merchantName: 'متجر البن', language: 'ar',
    });

    expect(result).toMatchObject({ projectId: 'project_1', versionId: 'version_1', content: validPayload });
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ai.example.test/api/v1/wasla/projects');
    const token = String((request.headers as Record<string, string>).authorization).replace('Bearer ', '');
    const verified = await jwtVerify(token, new TextEncoder().encode('a-secure-test-secret'), { issuer: 'wasla', audience: 'ai-core' });
    expect(verified.payload).toMatchObject({ org: 'merchant_1', sub: 'user_1', language: 'ar' });
    expect(JSON.parse(String(request.body))).toMatchObject({ merchant_description: 'متجر قهوة', business_type: 'ecommerce' });
  });

  it('fails closed when AI Core reports validation errors', async () => {
    process.env.AI_CORE_BASE_URL = 'https://ai.example.test';
    process.env.AI_CORE_SECRET_WASLA = 'a-secure-test-secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok', project_id: 'project_1', version_id: 'version_1', version_number: 1,
      payload: validPayload, validation_errors: ['categories invalid'],
    }), { status: 200 })));

    await expect(new AiCoreStoreContentProvider().generate('متجر', {
      merchantId: 'merchant_1', actorId: 'user_1',
    })).rejects.toThrow('مسودة غير صالحة');
  });
});
