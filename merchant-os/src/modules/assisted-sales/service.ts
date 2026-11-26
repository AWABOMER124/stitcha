import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import type { AuthContext } from '@/lib/permissions';
import { ROLE_PERMISSIONS } from '@/lib/permissions/constants';
import { requireMerchantEntitlement } from '@/modules/merchant-subscriptions/merchant-subscriptions.service';
import { getMerchantOnlinePaymentStatus, createMarketOrderCheckout } from '@/modules/paymob-payments/market-payments.service';
import * as ordersRepo from '@/modules/orders/repositories/orders.repository';
import { DEFAULT_SALES_SETTINGS, salesSettingsSchema, quoteInputSchema, checkoutInputSchema, priceQuote, type QuoteItem } from './policy';

type Db = Prisma.TransactionClient | typeof prisma;
export async function getSalesSettings(merchantId: string, db: Db = prisma) {
  const row = await db.salesSettings.findUnique({ where: { merchantId } });
  return salesSettingsSchema.parse(row?.config ?? DEFAULT_SALES_SETTINGS);
}

// Re-read membership and role for every operation: revoking access must take effect immediately.
export async function salesAccess(auth: AuthContext, write = false) {
  await requireMerchantEntitlement(auth.merchantId, 'assistedSales', 'المبيعات الخاصة متاحة في باقة أعمال.');
  const [membership, settings] = await Promise.all([
    prisma.merchantUser.findUnique({ where: { userId_merchantId: { userId: auth.userId, merchantId: auth.merchantId } },
      include: { assignedRole: { include: { permissions: { include: { permission: true } } } } } }),
    getSalesSettings(auth.merchantId),
  ]);
  if (!membership?.isActive) throw new ForbiddenError('عضوية الفريق غير مفعلة.');
  const owner = membership.isOwner || membership.role === 'MERCHANT_OWNER';
  const custom = membership.assignedRole?.permissions.map(p => p.permission.name) ?? [];
  const permissions = custom.length ? custom : ROLE_PERMISSIONS[membership.role];
  if (!owner && !permissions.includes(write ? 'orders:create' : 'orders:read')) throw new ForbiddenError('لا تملك صلاحية إدارة المبيعات.');
  const rule = settings.staffRules.find(r => r.userId === auth.userId);
  if (!owner && rule?.disabled) throw new ForbiddenError('تم إيقاف وصولك للمبيعات الخاصة.');
  return { settings, owner, canApprove: owner || Boolean(rule?.canApprove), canViewAll: owner || Boolean(rule?.canViewAll),
    discountLimit: owner ? 100 : rule?.discountPercent ?? settings.staffDiscountPercent };
}

export async function saveSalesSettings(auth: AuthContext, input: unknown) {
  const access = await salesAccess(auth);
  if (!access.owner) throw new ForbiddenError('إعدادات المبيعات متاحة لمالك المتجر.');
  const config = salesSettingsSchema.parse(input);
  if (new Set(config.staffRules.map(r => r.userId)).size !== config.staffRules.length) throw new BusinessRuleError('تكرار قواعد الموظف غير مسموح.');
  const count = await prisma.merchantUser.count({ where: { merchantId: auth.merchantId, isActive: true, userId: { in: config.staffRules.map(r => r.userId) } } });
  if (count !== config.staffRules.length) throw new BusinessRuleError('اختر أعضاء نشطين من فريق المتجر.');
  await prisma.salesSettings.upsert({ where: { merchantId: auth.merchantId }, create: { merchantId: auth.merchantId, config }, update: { config } });
}

export async function saveQuote(auth: AuthContext, input: unknown, id?: string, version?: number) {
  const access = await salesAccess(auth, true);
  if (!access.settings.enabled) throw new BusinessRuleError('المبيعات الخاصة متوقفة من إعدادات المتجر.');
  const data = quoteInputSchema.parse(input);
  if (data.paymentMethod === 'CASH' && !access.settings.allowCod) throw new BusinessRuleError('الدفع عند الاستلام غير مسموح.');
  if (data.deliveryMethod === 'PICKUP' && !access.settings.allowPickup) throw new BusinessRuleError('الاستلام من المتجر غير مسموح.');
  if (data.deliveryMethod === 'PICKUP' && data.deliveryFee !== 0) throw new BusinessRuleError('الاستلام من المتجر بدون رسوم شحن.');
  return prisma.$transaction(async tx => {
    if (id) await tx.$queryRaw`SELECT id FROM sales_quotes WHERE id = ${id} AND "merchantId" = ${auth.merchantId} FOR UPDATE`;
    const current = id ? await tx.salesQuote.findFirst({ where: { id, merchantId: auth.merchantId } }) : null;
    if (id && (!current || (!access.canViewAll && current.createdById !== auth.userId))) throw new NotFoundError('العرض');
    if (current && (current.orderId || current.status === 'CANCELLED' || current.version !== version)) throw new ConflictError('العرض تغير أو بدأ إتمامه؛ حدّث الصفحة.');
    const [products, merchant] = await Promise.all([
      tx.product.findMany({ where: { merchantId: auth.merchantId, isActive: true, id: { in: data.items.map(i => i.productId) } } }),
      tx.merchant.findUniqueOrThrow({ where: { id: auth.merchantId }, select: { currency: true } }),
    ]);
    if (products.length !== data.items.length) throw new BusinessRuleError('أحد المنتجات لم يعد متاحًا.');
    const items: QuoteItem[] = data.items.map(i => {
      const p = products.find(p => p.id === i.productId)!;
      return { ...i, name: p.name, sku: p.sku, listPrice: Number(p.price), total: Math.round(i.unitPrice * 100) * i.quantity / 100 };
    });
    const prices = priceQuote(items, data.deliveryFee);
    // Compare unrounded ratios so a fraction above the limit cannot bypass approval.
    const exceedsLimit = items.some(i => i.listPrice > 0 && i.unitPrice * 100 < i.listPrice * (100 - access.discountLimit) - 0.000001);
    const status = exceedsLimit ? 'PENDING_APPROVAL' : 'OPEN';
    const values = { customerName: data.customerName, customerPhone: data.customerPhone, currency: merchant.currency,
      items, ...prices, deliveryFee: data.deliveryFee, paymentMethod: data.paymentMethod, deliveryMethod: data.deliveryMethod,
      notes: data.notes, terms: access.settings.terms, expiresAt: new Date(Date.now() + data.expiryHours * 3600000), status,
      approvedById: null, token: randomBytes(32).toString('hex') };
    const quote = current ? await tx.salesQuote.update({ where: { id: current.id }, data: { ...values, version: { increment: 1 } } })
      : await tx.salesQuote.create({ data: { ...values, merchantId: auth.merchantId, createdById: auth.userId } });
    await tx.salesQuoteEvent.create({ data: { quoteId: quote.id, actorId: auth.userId, type: current ? 'REVISED' : 'CREATED', details: { version: quote.version, total: prices.total, status } } });
    return { id: quote.id, status, token: status === 'OPEN' ? quote.token : null, customerName: quote.customerName,
      customerPhone: quote.customerPhone, total: prices.total, currency: quote.currency };
  });
}

export async function changeQuoteState(auth: AuthContext, id: string, version: number, decision: 'APPROVE' | 'CANCEL') {
  const access = await salesAccess(auth, true);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM sales_quotes WHERE id = ${id} AND "merchantId" = ${auth.merchantId} FOR UPDATE`;
    const quote = await tx.salesQuote.findFirst({ where: { id, merchantId: auth.merchantId } });
    if (!quote || (!access.canViewAll && !access.canApprove && quote.createdById !== auth.userId)) throw new NotFoundError('العرض');
    if (quote.orderId || quote.version !== version || quote.status === 'CANCELLED') throw new ConflictError('العرض تغير أو بدأ إتمامه؛ حدّث الصفحة.');
    if (decision === 'APPROVE' && (!access.canApprove || quote.status !== 'PENDING_APPROVAL' || quote.createdById === auth.userId)) throw new ForbiddenError('الموافقة تحتاج مشرفًا آخر مخولًا.');
    const updated = await tx.salesQuote.update({ where: { id }, data: { status: decision === 'APPROVE' ? 'OPEN' : 'CANCELLED',
      ...(decision === 'APPROVE' ? { approvedById: auth.userId } : {}), version: { increment: 1 } } });
    await tx.salesQuoteEvent.create({ data: { quoteId: id, actorId: auth.userId, type: decision, details: { version: updated.version } } });
  });
}

export async function checkoutQuote(token: string, input: unknown, origin: string) {
  const address = checkoutInputSchema.parse(input);
  const found = await prisma.salesQuote.findUnique({ where: { token } });
  if (!found) throw new NotFoundError('العرض');
  // Existing orders remain payable when the subscription changes: an agreed order is already locked.
  if (!found.orderId) await requireMerchantEntitlement(found.merchantId, 'assistedSales');
  const settings = await getSalesSettings(found.merchantId);
  if (!settings.enabled && !found.orderId) throw new BusinessRuleError('استقبال العروض متوقف حاليًا.');
  if (found.paymentMethod === 'ONLINE') {
    const gateway = await getMerchantOnlinePaymentStatus(found.merchantId);
    if (!gateway.ready) throw new BusinessRuleError('الدفع الإلكتروني غير مفعل لهذا المتجر حاليًا. تواصل مع موظف المبيعات.');
  }
  const order = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM sales_quotes WHERE id = ${found.id} FOR UPDATE`;
    const quote = await tx.salesQuote.findUniqueOrThrow({ where: { token } });
    const merchant = await tx.merchant.findUniqueOrThrow({ where: { id: quote.merchantId }, select: { currency: true, status: true } });
    if (merchant.currency !== quote.currency || merchant.status !== 'ACTIVE') throw new BusinessRuleError('المتجر غير متاح لإتمام هذا العرض.');
    if (quote.orderId) return tx.order.findUniqueOrThrow({ where: { id: quote.orderId }, include: { payment: true } });
    if (quote.status !== 'OPEN' || quote.expiresAt <= new Date()) throw new ConflictError('العرض غير متاح أو انتهت صلاحيته. اطلب رابطًا محدثًا.');
    if (quote.paymentMethod === 'CASH' && !settings.allowCod) throw new BusinessRuleError('الدفع عند الاستلام غير متاح.');
    if (quote.deliveryMethod === 'PICKUP' && !settings.allowPickup) throw new BusinessRuleError('الاستلام من المتجر غير متاح.');
    if (quote.deliveryMethod !== 'PICKUP' && (!address.city || !address.district || !address.address)) throw new BusinessRuleError('أكمل المدينة والحي والعنوان.');
    const items = quote.items as unknown as QuoteItem[];
    const active = await tx.product.count({ where: { merchantId: quote.merchantId, isActive: true, id: { in: items.map(i => i.productId) } } });
    if (active !== items.length) throw new BusinessRuleError('أحد المنتجات لم يعد متاحًا؛ تواصل مع موظف المبيعات.');
    // Serialize customer creation for concurrent quotes for the same phone.
    await tx.$queryRaw`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${quote.merchantId + ':' + quote.customerPhone}))) AS sales_customer_lock`;
    const customer = await tx.customer.findFirst({ where: { merchantId: quote.merchantId, phone: quote.customerPhone } })
      ?? await tx.customer.create({ data: { merchantId: quote.merchantId, name: quote.customerName, phone: quote.customerPhone } });
    const created = await ordersRepo.create(quote.merchantId, {
      orderNumber: `SALE-${randomBytes(6).toString('hex').toUpperCase()}`, customerId: customer.id,
      subtotal: Number(quote.subtotal), deliveryFee: Number(quote.deliveryFee), total: Number(quote.total), currency: quote.currency,
      customerName: quote.customerName, customerPhone: quote.customerPhone,
      customerAddress: address.address, customerCity: address.city, customerDistrict: address.district,
      notes: quote.notes ?? undefined, deliveryMethod: quote.deliveryMethod, paymentMethod: quote.paymentMethod,
      items: items.map(i => ({ productId: i.productId, productSnapshot: { name: i.name, price: i.unitPrice, sku: i.sku, listPrice: i.listPrice },
        quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    }, tx);
    await tx.salesQuote.update({ where: { id: quote.id }, data: { orderId: created.id, status: 'CONVERTED', version: { increment: 1 } } });
    await tx.salesQuoteEvent.create({ data: { quoteId: quote.id, type: 'CHECKOUT_STARTED', details: { orderId: created.id } } });
    return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: { payment: true } });
  }, { timeout: 15000 });
  if (['CANCELLED', 'REJECTED'].includes(order.status)) throw new ConflictError('الطلب ملغي؛ تواصل مع المتجر.');
  if (order.payment?.status === 'COMPLETED' || order.paymentMethod === 'CASH') return { completed: true };
  const session = await createMarketOrderCheckout({ merchantId: found.merchantId, orderId: order.id, origin, returnPath: `/pay/${token}` });
  return { checkoutUrl: session.checkoutUrl };
}

export async function switchSaleToOnline(auth: AuthContext, id: string, version: number) {
  const access = await salesAccess(auth, true);
  if (!(await getMerchantOnlinePaymentStatus(auth.merchantId)).ready) throw new BusinessRuleError('فعّل الدفع الإلكتروني أولًا.');
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM sales_quotes WHERE id = ${id} AND "merchantId" = ${auth.merchantId} FOR UPDATE`;
    const quote = await tx.salesQuote.findFirst({ where: { id, merchantId: auth.merchantId } });
    if (!quote || (!access.canViewAll && quote.createdById !== auth.userId)) throw new NotFoundError('العرض');
    if (!quote.orderId || quote.version !== version || quote.paymentMethod !== 'CASH') throw new ConflictError('لا يمكن تحويل هذا العرض. حدّث الصفحة.');
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${quote.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: quote.orderId }, include: { payment: true, platformShipment: true, delivery: true } });
    if (order.status !== 'NEW' || order.paymentMethod !== 'CASH' || order.payment?.status !== 'PENDING' || order.platformShipment || order.delivery?.providerReference) {
      throw new BusinessRuleError('التحويل متاح فقط قبل قبول الطلب أو تحصيله أو إنشاء شحنته.');
    }
    await tx.order.update({ where: { id: order.id }, data: { paymentMethod: 'ONLINE', payment: { update: { method: 'ONLINE' } } } });
    await tx.salesQuote.update({ where: { id }, data: { paymentMethod: 'ONLINE', version: { increment: 1 } } });
    await tx.salesQuoteEvent.create({ data: { quoteId: id, actorId: auth.userId, type: 'SWITCHED_TO_ONLINE', details: { orderId: order.id } } });
  });
}
