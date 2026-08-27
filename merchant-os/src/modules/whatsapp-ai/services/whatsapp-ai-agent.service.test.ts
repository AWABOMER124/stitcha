import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  whatsAppConfig: { findUnique: vi.fn() },
  conversation: { findFirst: vi.fn(), update: vi.fn() },
  whatsAppAiUsage: { upsert: vi.fn() },
  merchant: { findUnique: vi.fn() },
  product: { findMany: vi.fn() },
  inboxMessage: { findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
};
const getMerchantPlanSnapshot = vi.fn();
const sendMessage = vi.fn();

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/modules/merchant-subscriptions', () => ({ getMerchantPlanSnapshot }));
vi.mock('@/modules/whatsapp-channel/services/whatsapp-channel.service', () => ({ sendMessage }));

const { handleInboundAiAgent, requestsHuman } = await import('./whatsapp-ai-agent.service');
const previousApiKey = process.env.ANTHROPIC_API_KEY;

const inbound = { merchantId: 'merchant_1', conversationId: 'conv_1', customerPhone: '249900000000', text: 'هل لديكم قهوة؟' };

describe('WhatsApp AI customer service agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue({ isActive: true, aiAgentEnabled: true, aiAgentPrompt: null });
    prismaMock.conversation.findFirst.mockResolvedValue({ aiAgentPaused: false, orderContext: null });
    prismaMock.whatsAppAiUsage.upsert.mockResolvedValue({ count: 1 });
    getMerchantPlanSnapshot.mockResolvedValue({ entitlements: { whatsappAiAgent: true, aiMonthlyCredits: 100 } });
    prismaMock.merchant.findUnique.mockResolvedValue({ name: 'Store', description: 'Coffee', phone: null, address: null, currency: 'SDG', storefrontSettings: { isOpen: true, deliveryEnabled: true, pickupEnabled: true, welcomeText: null, workingHours: null } });
    prismaMock.product.findMany.mockResolvedValue([{ name: 'قهوة', description: 'قهوة سودانية', price: 1000 }]);
    prismaMock.inboxMessage.findMany.mockResolvedValue([{ isFromCustomer: true, content: inbound.text }]);
    sendMessage.mockResolvedValue({ success: true });
    prismaMock.$transaction.mockResolvedValue([]);
  });

  afterAll(() => {
    if (previousApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousApiKey;
    vi.unstubAllGlobals();
  });

  it.each(['عايز موظف', 'human please', 'خدمة العملاء لو سمحت'])('recognizes human handoff request: %s', text => {
    expect(requestsHuman(text)).toBe(true);
  });

  it('does nothing when the merchant has not enabled the agent', async () => {
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue({ isActive: true, aiAgentEnabled: false, aiAgentPrompt: null });
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(handleInboundAiAgent(inbound)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('pauses automation and acknowledges a human handoff without calling AI', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(handleInboundAiAgent({ ...inbound, text: 'ممكن اتحدث مع موظف؟' })).resolves.toBe(true);
    expect(prismaMock.conversation.update).toHaveBeenCalledWith({ where: { id: 'conv_1' }, data: { aiAgentPaused: true, status: 'PENDING' } });
    expect(sendMessage).toHaveBeenCalledWith('merchant_1', inbound.customerPhone, expect.stringContaining('فريق المتجر'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops before provider usage after the monthly allowance is exhausted', async () => {
    prismaMock.whatsAppAiUsage.upsert.mockResolvedValue({ count: 101 });
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(handleInboundAiAgent(inbound)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('grounds a short answer, sends it, and stores the outbound transcript', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'نعم، القهوة السودانية متاحة بسعر 1,000 SDG.' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(handleInboundAiAgent(inbound)).resolves.toBe(true);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(request.body)).toContain('قهوة سودانية');
    expect(sendMessage).toHaveBeenCalledWith('merchant_1', inbound.customerPhone, expect.stringContaining('1,000 SDG'));
    expect(prismaMock.inboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ conversationId: 'conv_1', isFromCustomer: false, senderName: 'وصلة AI' }) });
  });
});
