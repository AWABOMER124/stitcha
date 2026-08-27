import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = {
  conversation: { findUnique: vi.fn(), update: vi.fn() },
  category: { findMany: vi.fn() },
  product: { findMany: vi.fn(), findFirst: vi.fn() },
};

const whatsappChannelServiceMock = {
  sendMessage: vi.fn(),
};

const ordersServiceMock = {
  createOrder: vi.fn(),
};

vi.mock('@/lib/db/prisma', () => ({ default: prismaMock }));
vi.mock('@/modules/whatsapp-channel/services/whatsapp-channel.service', () => whatsappChannelServiceMock);
vi.mock('@/modules/orders/services/orders.service', () => ordersServiceMock);

const {
  isMenuTrigger,
  isCancelCommand,
  isDoneCommand,
  parseNumberChoice,
  formatCategoryMenu,
  formatProductMenu,
  handleInboundMessage,
} = await import('./whatsapp-ordering.service');

function resetMocks() {
  Object.values(prismaMock.conversation).forEach((fn) => fn.mockReset());
  Object.values(prismaMock.category).forEach((fn) => fn.mockReset());
  Object.values(prismaMock.product).forEach((fn) => fn.mockReset());
  whatsappChannelServiceMock.sendMessage.mockReset().mockResolvedValue({ success: true });
  ordersServiceMock.createOrder.mockReset();
}

describe('whatsapp-ordering.service — pure helpers', () => {
  it.each(['قائمة', 'menu', 'MENU', ' طلب ', 'ابدأ', 'start'])('recognizes "%s" as a menu trigger', (text) => {
    expect(isMenuTrigger(text)).toBe(true);
  });

  it('does not treat arbitrary text as a menu trigger', () => {
    expect(isMenuTrigger('مرحبا كيف الحال')).toBe(false);
  });

  it.each(['إلغاء', 'cancel', 'خروج'])('recognizes "%s" as a cancel command', (text) => {
    expect(isCancelCommand(text)).toBe(true);
  });

  it.each(['إنهاء', 'تم', 'done'])('recognizes "%s" as a done command', (text) => {
    expect(isDoneCommand(text)).toBe(true);
  });

  it('parses a positive integer as a menu choice', () => {
    expect(parseNumberChoice('2')).toBe(2);
    expect(parseNumberChoice(' 10 ')).toBe(10);
  });

  it.each(['0', '-1', 'abc', '1.5', ''])('rejects "%s" as a menu choice', (text) => {
    expect(parseNumberChoice(text)).toBeNull();
  });

  it('formats a numbered category menu', () => {
    const menu = formatCategoryMenu([{ name: 'برجر' }, { name: 'مشروبات' }]);
    expect(menu).toContain('1. برجر');
    expect(menu).toContain('2. مشروبات');
  });

  it('formats a numbered product menu including the running cart', () => {
    const menu = formatProductMenu(
      [{ name: 'كلاسيك', price: 100 }],
      [{ productId: 'p0', name: 'دبل', price: 200, quantity: 2 }]
    );
    expect(menu).toContain('1. كلاسيك — 100 SDG');
    expect(menu).toContain('دبل × 2');
  });
});

describe('whatsapp-ordering.service — handleInboundMessage state machine', () => {
  beforeEach(resetMocks);

  const baseParams = {
    merchantId: 'merch_1',
    conversationId: 'conv_1',
    customerName: 'Ahmed',
    customerPhone: '+249911111111',
  };

  it('ignores a message with no active flow and no trigger word (leaves it for a human)', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ orderContext: null });
    await handleInboundMessage({ ...baseParams, text: 'مرحبا، هل المتجر مفتوح؟' });
    expect(whatsappChannelServiceMock.sendMessage).not.toHaveBeenCalled();
    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
  });

  it('starts the flow and shows categories on a trigger word', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ orderContext: null });
    prismaMock.category.findMany.mockResolvedValue([{ id: 'cat_1', name: 'برجر' }, { id: 'cat_2', name: 'مشروبات' }]);

    await handleInboundMessage({ ...baseParams, text: 'قائمة' });

    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv_1' },
        data: expect.objectContaining({ orderContext: expect.objectContaining({ state: 'AWAITING_CATEGORY', categoryIds: ['cat_1', 'cat_2'] }) }),
      })
    );
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('برجر'));
  });

  it('tells the customer there is nothing to show when the merchant has no categories', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ orderContext: null });
    prismaMock.category.findMany.mockResolvedValue([]);

    await handleInboundMessage({ ...baseParams, text: 'menu' });

    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('لا توجد فئات'));
  });

  it('moves from AWAITING_CATEGORY to AWAITING_PRODUCT on a valid category number', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_CATEGORY', categoryIds: ['cat_1', 'cat_2'], cart: [] },
    });
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'كلاسيك برجر', price: 100 }]);

    await handleInboundMessage({ ...baseParams, text: '1' });

    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderContext: expect.objectContaining({ state: 'AWAITING_PRODUCT', categoryId: 'cat_1', productIds: ['prod_1'] }),
        }),
      })
    );
  });

  it('rejects an out-of-range category number without changing state', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_CATEGORY', categoryIds: ['cat_1'], cart: [] },
    });

    await handleInboundMessage({ ...baseParams, text: '9' });

    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('رقم صحيح'));
  });

  it('adds a product to the cart and re-shows the same category', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_PRODUCT', categoryId: 'cat_1', productIds: ['prod_1'], cart: [] },
    });
    prismaMock.product.findFirst.mockResolvedValue({ id: 'prod_1', name: 'كلاسيك برجر', price: 100 });
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'كلاسيك برجر', price: 100 }]);

    await handleInboundMessage({ ...baseParams, text: '1' });

    const updateCall = prismaMock.conversation.update.mock.calls[0][0];
    expect(updateCall.data.orderContext.cart).toEqual([{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 1 }]);
  });

  it('increments quantity when the same product is chosen twice', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: {
        state: 'AWAITING_PRODUCT',
        categoryId: 'cat_1',
        productIds: ['prod_1'],
        cart: [{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 1 }],
      },
    });
    prismaMock.product.findFirst.mockResolvedValue({ id: 'prod_1', name: 'كلاسيك برجر', price: 100 });
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', name: 'كلاسيك برجر', price: 100 }]);

    await handleInboundMessage({ ...baseParams, text: '1' });

    const updateCall = prismaMock.conversation.update.mock.calls[0][0];
    expect(updateCall.data.orderContext.cart).toEqual([{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 2 }]);
  });

  it('refuses to finish an empty cart', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_PRODUCT', categoryId: 'cat_1', productIds: ['prod_1'], cart: [] },
    });

    await handleInboundMessage({ ...baseParams, text: 'إنهاء' });

    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('سلتك فارغة'));
  });

  it('moves to AWAITING_ADDRESS on "إنهاء" with a non-empty cart', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: {
        state: 'AWAITING_PRODUCT',
        categoryId: 'cat_1',
        productIds: ['prod_1'],
        cart: [{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 2 }],
      },
    });

    await handleInboundMessage({ ...baseParams, text: 'إنهاء' });

    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderContext: expect.objectContaining({ state: 'AWAITING_ADDRESS' }) }) })
    );
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('200'));
  });

  it('creates a real order and clears context when an address is provided', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: {
        state: 'AWAITING_ADDRESS',
        cart: [{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 2 }],
      },
    });
    ordersServiceMock.createOrder.mockResolvedValue({ id: 'order_1', orderNumber: 'ORD-ABC12345', total: 225 });

    await handleInboundMessage({ ...baseParams, text: 'حي الرياض، شارع 10، منزل رقم 5' });

    expect(ordersServiceMock.createOrder).toHaveBeenCalledWith('merch_1', {
      customerName: 'Ahmed',
      customerPhone: '+249911111111',
      customerAddress: 'حي الرياض، شارع 10، منزل رقم 5',
      deliveryMethod: 'MERCHANT_DELIVERY',
      paymentMethod: 'CASH',
      notes: 'Order placed via WhatsApp bot',
      items: [{ productId: 'prod_1', quantity: 2 }],
    });
    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { orderContext: null } })
    );
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('ORD-ABC12345'));
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('225'));
  });

  it('rejects a too-short address without creating an order', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_ADDRESS', cart: [{ productId: 'prod_1', name: 'كلاسيك برجر', price: 100, quantity: 1 }] },
    });

    await handleInboundMessage({ ...baseParams, text: 'ok' });

    expect(ordersServiceMock.createOrder).not.toHaveBeenCalled();
  });

  it('cancels an in-progress flow and clears its context', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      orderContext: { state: 'AWAITING_CATEGORY', categoryIds: ['cat_1'], cart: [] },
    });

    await handleInboundMessage({ ...baseParams, text: 'إلغاء' });

    expect(prismaMock.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { orderContext: null } })
    );
    expect(whatsappChannelServiceMock.sendMessage).toHaveBeenCalledWith('merch_1', baseParams.customerPhone, expect.stringContaining('تم إلغاء'));
  });

  it('does nothing on a cancel command when there is no active flow', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ orderContext: null });
    await handleInboundMessage({ ...baseParams, text: 'إلغاء' });
    expect(whatsappChannelServiceMock.sendMessage).not.toHaveBeenCalled();
  });
});
