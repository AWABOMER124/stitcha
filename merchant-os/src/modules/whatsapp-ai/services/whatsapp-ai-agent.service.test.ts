import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  whatsAppConfig: { findUnique: vi.fn() },
  conversation: { findFirst: vi.fn(), update: vi.fn() },
  merchant: { findUnique: vi.fn() },
  product: { findMany: vi.fn() },
  inboxMessage: { findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
};
const getMerchantPlanSnapshot = vi.fn();
const sendMessage = vi.fn();
const runMeteredAiOperation = vi.fn();
const askCopilot = vi.fn();

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/modules/merchant-subscriptions', () => ({ getMerchantPlanSnapshot }));
vi.mock('@/modules/whatsapp-channel/services/whatsapp-channel.service', () => ({ sendMessage }));
vi.mock('@/modules/ai-usage', () => ({
  AI_FEATURE_KEYS: { WHATSAPP_CONVERSATION_MONTHLY: 'ai.whatsapp_conversation.monthly' },
  runMeteredAiOperation,
}));
vi.mock('@/services/ai/providers/ai-core-store-content.provider', () => ({
  isAiCoreStoreGenerationConfigured: () => true,
  AiCoreStoreContentProvider: class { askCopilot = askCopilot; },
}));

const { handleInboundAiAgent, requestsHuman } = await import('./whatsapp-ai-agent.service');
const inbound = { merchantId: 'merchant_1', conversationId: 'conv_1', customerPhone: '249900000000', text: 'هل لديكم قهوة؟' };

describe('WhatsApp AI customer service agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    askCopilot.mockResolvedValue({ answer: 'نعم، القهوة السودانية متاحة بسعر 1,000 SDG.', requestId: 'ai_request_1' });
    prismaMock.whatsAppConfig.findUnique.mockResolvedValue({ isActive: true, aiAgentEnabled: true, aiAgentPrompt: null });
    prismaMock.conversation.findFirst.mockResolvedValue({ aiAgentPaused: false, orderContext: null });
    getMerchantPlanSnapshot.mockResolvedValue({ entitlements: { whatsappAiAgent: true, whatsappAiConversationsMonthly: 100 } });
    runMeteredAiOperation.mockImplementation(async (_input: unknown, execute: () => Promise<{ value: unknown }>) => (await execute()).value);
    prismaMock.merchant.findUnique.mockResolvedValue({ name: 'Store', description: 'Coffee', phone: null, address: null, currency: 'SDG', storefrontSettings: { isOpen: true, deliveryEnabled: true, pickupEnabled: true, welcomeText: null, workingHours: null } });
    prismaMock.product.findMany.mockResolvedValue([{ name: 'قهوة', description: 'قهوة سودانية', price: 1000 }]);
    prismaMock.inboxMessage.findMany.mockResolvedValue([{ isFromCustomer: true, content: inbound.text }]);
    sendMessage.mockResolvedValue({ success: true });
    prismaMock.$transaction.mockResolvedValue([]);
  });

  afterAll(() => {
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
    runMeteredAiOperation.mockRejectedValue(new Error('quota exhausted'));
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(handleInboundAiAgent(inbound)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('uses the inbound WhatsApp message ID as the idempotency key', async () => {
    await expect(handleInboundAiAgent({ ...inbound, externalMessageId: 'wamid.123' })).resolves.toBe(true);
    expect(runMeteredAiOperation).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: 'whatsapp:wamid.123', limit: 100,
    }), expect.any(Function));
  });

  it('grounds a short answer, sends it, and stores the outbound transcript', async () => {
    await expect(handleInboundAiAgent(inbound)).resolves.toBe(true);
    expect(askCopilot).toHaveBeenCalledWith(expect.stringContaining('قهوة سودانية'), expect.any(Object), expect.objectContaining({ merchantId: 'merchant_1' }));
    expect(sendMessage).toHaveBeenCalledWith('merchant_1', inbound.customerPhone, expect.stringContaining('1,000 SDG'));
    expect(prismaMock.inboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ conversationId: 'conv_1', isFromCustomer: false, senderName: 'وصلة AI' }) });
  });
});
