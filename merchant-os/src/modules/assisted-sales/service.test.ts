import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SALES_SETTINGS } from './policy';

const m = vi.hoisted(() => ({
  db: {
    salesSettings: { findUnique: vi.fn(), upsert: vi.fn() }, merchantUser: { findUnique: vi.fn(), count: vi.fn() },
    product: { findMany: vi.fn(), count: vi.fn() }, merchant: { findUniqueOrThrow: vi.fn() },
    salesQuote: { findFirst: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    salesQuoteEvent: { create: vi.fn() }, customer: { findFirst: vi.fn(), create: vi.fn() },
    order: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(),
  }, entitlement: vi.fn(), gatewayStatus: vi.fn(), checkout: vi.fn(), createOrder: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({ default: m.db }));
vi.mock('@/modules/merchant-subscriptions/merchant-subscriptions.service', () => ({ requireMerchantEntitlement: m.entitlement }));
vi.mock('@/modules/paymob-payments/market-payments.service', () => ({ getMerchantOnlinePaymentStatus: m.gatewayStatus, createMarketOrderCheckout: m.checkout }));
vi.mock('@/modules/orders/repositories/orders.repository', () => ({ create: m.createOrder }));
const { salesAccess, saveQuote, changeQuoteState, checkoutQuote, switchSaleToOnline, saveSalesSettings } = await import('./service');

const auth = { userId: 'cm00000000000000000000002', merchantId: 'merchant-one', role: 'CASHIER', permissions: ['orders:create', 'orders:read'] };
const productId = 'cm00000000000000000000001';
const input = { customerName: 'عميل تجريبي', customerPhone: '+966500000000', items: [{ productId, quantity: 2, unitPrice: 300 }],
  deliveryFee: 25, expiryHours: 48, paymentMethod: 'ONLINE', deliveryMethod: 'MERCHANT_DELIVERY' };
const baseQuote = { id: 'quote-one', merchantId: auth.merchantId, createdById: auth.userId, status: 'OPEN', token: 'a'.repeat(64), version: 1, orderId: null,
  items: [{ productId, name: 'منتج', sku: null, listPrice: 350, unitPrice: 300, quantity: 2, total: 600 }],
  customerName: 'عميل', customerPhone: '+966500000000', currency: 'SAR', subtotal: 600, deliveryFee: 25, total: 625,
  paymentMethod: 'ONLINE', deliveryMethod: 'MERCHANT_DELIVERY', notes: null, expiresAt: new Date('2099-01-01') };
const order = { id: 'order-one', status: 'NEW', paymentMethod: 'ONLINE', payment: { method: 'ONLINE', status: 'PENDING' } };

beforeEach(() => {
  vi.resetAllMocks();
  m.db.$transaction.mockImplementation(async fn => fn(m.db));
  m.db.merchantUser.findUnique.mockResolvedValue({ isActive: true, isOwner: false, role: 'CASHIER', assignedRole: null });
  m.db.salesSettings.findUnique.mockResolvedValue({ config: DEFAULT_SALES_SETTINGS });
  m.db.product.findMany.mockResolvedValue([{ id: productId, name: 'منتج', price: 350, sku: null }]);
  m.db.product.count.mockResolvedValue(1);
  m.db.merchant.findUniqueOrThrow.mockResolvedValue({ currency: 'SAR', status: 'ACTIVE' });
  m.db.salesQuote.create.mockImplementation(async ({ data }) => ({ ...data, id: 'quote-one', version: 1 }));
  m.db.salesQuote.findUnique.mockResolvedValue({ ...baseQuote });
  m.db.salesQuote.findUniqueOrThrow.mockResolvedValue({ ...baseQuote });
  m.db.salesQuote.findFirst.mockResolvedValue({ ...baseQuote });
  m.db.salesQuote.update.mockImplementation(async ({ data }) => ({ ...baseQuote, ...data, version: 2 }));
  m.db.customer.findFirst.mockResolvedValue({ id: 'customer-one' });
  m.db.order.findUniqueOrThrow.mockResolvedValue(order);
  m.createOrder.mockResolvedValue(order);
  m.gatewayStatus.mockResolvedValue({ ready: true });
  m.checkout.mockResolvedValue({ checkoutUrl: 'https://gateway.example/checkout' });
});

describe('sales access and price approvals', () => {
  it('enforces plan entitlement and fresh active membership', async () => {
    m.entitlement.mockRejectedValueOnce(new Error('upgrade'));
    await expect(salesAccess(auth)).rejects.toThrow('upgrade');
    m.db.merchantUser.findUnique.mockResolvedValueOnce({ isActive: false });
    await expect(salesAccess(auth)).rejects.toThrow('عضوية');
  });
  it('revokes feature access immediately and respects custom roles', async () => {
    m.db.salesSettings.findUnique.mockResolvedValueOnce({ config: { ...DEFAULT_SALES_SETTINGS, staffRules: [{ userId: auth.userId, discountPercent: 5, disabled: true }] } });
    await expect(salesAccess(auth)).rejects.toThrow('إيقاف');
    m.db.merchantUser.findUnique.mockResolvedValueOnce({ isActive: true, role: 'CASHIER', assignedRole: { permissions: [{ permission: { name: 'products:read' } }] } });
    await expect(saveQuote(auth, input)).rejects.toThrow('صلاحية');
  });
  it('requires approval above the per-staff discount threshold', async () => {
    const result = await saveQuote(auth, input);
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.token).toBeNull();
    expect(m.db.salesQuote.create).toHaveBeenCalledWith({ data: expect.objectContaining({ total: 625, createdById: auth.userId, merchantId: auth.merchantId, currency: 'SAR' }) });
  });
  it('cannot bypass the threshold through rounding', async () => {
    m.db.product.findMany.mockResolvedValue([{ id: productId, name: 'منتج', price: 1000, sku: null }]);
    expect((await saveQuote(auth, { ...input, items: [{ productId, quantity: 1, unitPrice: 899.99 }] })).status).toBe('PENDING_APPROVAL');
    expect((await saveQuote(auth, { ...input, items: [{ productId, quantity: 1, unitPrice: 900 }] })).status).toBe('OPEN');
  });
  it('rotates links and clears approval when an offer is revised', async () => {
    await saveQuote(auth, input, baseQuote.id, 1);
    expect(m.db.salesQuote.update).toHaveBeenCalledWith({ where: { id: baseQuote.id }, data: expect.objectContaining({ token: expect.any(String), approvedById: null, version: { increment: 1 } }) });
    expect(m.db.salesQuote.update.mock.calls[0][0].data.token).not.toBe(baseQuote.token);
  });
  it('cannot edit another staff member offer or a locked order', async () => {
    m.db.salesQuote.findFirst.mockResolvedValueOnce({ ...baseQuote, createdById: 'other' });
    await expect(saveQuote(auth, input, baseQuote.id, 1)).rejects.toThrow();
    m.db.salesQuote.findFirst.mockResolvedValueOnce({ ...baseQuote, orderId: order.id });
    await expect(saveQuote(auth, input, baseQuote.id, 1)).rejects.toThrow('بدأ');
    expect(m.db.salesQuote.update).not.toHaveBeenCalled();
  });
  it('blocks self approval and stale approvals', async () => {
    m.db.salesSettings.findUnique.mockResolvedValue({ config: { ...DEFAULT_SALES_SETTINGS, staffRules: [{ userId: auth.userId, discountPercent: 10, canApprove: true }] } });
    m.db.salesQuote.findFirst.mockResolvedValueOnce({ ...baseQuote, status: 'PENDING_APPROVAL' });
    await expect(changeQuoteState(auth, baseQuote.id, 1, 'APPROVE')).rejects.toThrow('مشرف');
    await expect(changeQuoteState(auth, baseQuote.id, 0, 'APPROVE')).rejects.toThrow('تغير');
  });
  it('only an owner can change team policy', async () => {
    await expect(saveSalesSettings(auth, DEFAULT_SALES_SETTINGS)).rejects.toThrow('مالك');
    expect(m.db.salesSettings.upsert).not.toHaveBeenCalled();
  });
});

describe('guest checkout and order identity', () => {
  const address = { city: 'الرياض', district: 'النرجس', address: 'شارع الاختبار مبنى ١' };
  it('creates an order with the server-locked amount and returns the gateway URL', async () => {
    expect(await checkoutQuote(baseQuote.token, { ...address, total: 1 }, 'https://store.example')).toEqual({ checkoutUrl: 'https://gateway.example/checkout' });
    expect(m.createOrder).toHaveBeenCalledWith(auth.merchantId, expect.objectContaining({ total: 625, paymentMethod: 'ONLINE', items: [expect.objectContaining({ unitPrice: 300, quantity: 2 })] }), m.db);
    expect(m.checkout).toHaveBeenCalledWith(expect.objectContaining({ orderId: order.id, returnPath: `/pay/${baseQuote.token}` }));
  });
  it('rejects expired and pending-approval links without creating orders', async () => {
    m.db.salesQuote.findUniqueOrThrow.mockResolvedValueOnce({ ...baseQuote, expiresAt: new Date(0) });
    await expect(checkoutQuote(baseQuote.token, address, 'https://store.example')).rejects.toThrow('صلاحيته');
    m.db.salesQuote.findUniqueOrThrow.mockResolvedValueOnce({ ...baseQuote, status: 'PENDING_APPROVAL' });
    await expect(checkoutQuote(baseQuote.token, address, 'https://store.example')).rejects.toThrow('غير متاح');
    expect(m.createOrder).not.toHaveBeenCalled();
  });
  it('does not create inventory-reserving orders when the gateway is unavailable', async () => {
    m.gatewayStatus.mockResolvedValue({ ready: false });
    await expect(checkoutQuote(baseQuote.token, address, 'https://store.example')).rejects.toThrow('غير مفعل');
    expect(m.createOrder).not.toHaveBeenCalled();
  });
  it('reuses the existing order even if the display expiry has elapsed', async () => {
    m.db.salesQuote.findUnique.mockResolvedValue({ ...baseQuote, orderId: order.id });
    m.db.salesQuote.findUniqueOrThrow.mockResolvedValue({ ...baseQuote, orderId: order.id, expiresAt: new Date(0) });
    await checkoutQuote(baseQuote.token, {}, 'https://store.example');
    await checkoutQuote(baseQuote.token, {}, 'https://store.example');
    expect(m.createOrder).not.toHaveBeenCalled();
    expect(m.checkout).toHaveBeenCalledTimes(2);
    expect(m.entitlement).not.toHaveBeenCalled();
  });
  it('never opens another payment for a completed or cancelled order', async () => {
    m.db.salesQuote.findUniqueOrThrow.mockResolvedValue({ ...baseQuote, orderId: order.id });
    m.db.order.findUniqueOrThrow.mockResolvedValueOnce({ ...order, payment: { status: 'COMPLETED' } });
    expect(await checkoutQuote(baseQuote.token, {}, 'https://store.example')).toEqual({ completed: true });
    m.db.order.findUniqueOrThrow.mockResolvedValueOnce({ ...order, status: 'CANCELLED' });
    await expect(checkoutQuote(baseQuote.token, {}, 'https://store.example')).rejects.toThrow('ملغي');
    expect(m.checkout).not.toHaveBeenCalled();
  });
  it('requires an address and currently active products', async () => {
    await expect(checkoutQuote(baseQuote.token, {}, 'https://store.example')).rejects.toThrow('العنوان');
    m.db.product.count.mockResolvedValueOnce(0);
    await expect(checkoutQuote(baseQuote.token, address, 'https://store.example')).rejects.toThrow('منتجات');
    expect(m.createOrder).not.toHaveBeenCalled();
  });
  it('converts COD on the same unshipped unpaid order', async () => {
    m.db.salesQuote.findFirst.mockResolvedValue({ ...baseQuote, paymentMethod: 'CASH', orderId: order.id });
    m.db.order.findUniqueOrThrow.mockResolvedValue({ ...order, paymentMethod: 'CASH', payment: { status: 'PENDING' }, platformShipment: null, delivery: null });
    await switchSaleToOnline(auth, baseQuote.id, 1);
    expect(m.db.order.update).toHaveBeenCalledWith({ where: { id: order.id }, data: { paymentMethod: 'ONLINE', payment: { update: { method: 'ONLINE' } } } });
    expect(m.createOrder).not.toHaveBeenCalled();
    m.db.order.findUniqueOrThrow.mockResolvedValueOnce({ ...order, paymentMethod: 'CASH', payment: { status: 'PENDING' }, platformShipment: { id: 'shipped' } });
    await expect(switchSaleToOnline(auth, baseQuote.id, 1)).rejects.toThrow('قبل');
  });
});
