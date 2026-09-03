import prisma from '@/lib/db/prisma';
import { createWorkbook, type ExportColumn, type ExportRow } from './excel';

export const EXPORT_TYPES = ['orders', 'products', 'inventory', 'customers', 'transactions', 'settlements', 'invoices', 'affiliates', 'affiliate-commissions'] as const;
export type ExportType = typeof EXPORT_TYPES[number];
const LIMIT = 10_000;

const dateColumns = { width: 22, numFmt: 'yyyy-mm-dd hh:mm' };
const moneyColumns = { width: 16, numFmt: '#,##0.00' };

function range(from?: Date, to?: Date) {
  return from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
}

export async function buildMerchantExport(merchantId: string, type: ExportType, from?: Date, to?: Date) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { name: true, currency: true } });
  if (!merchant) throw new Error('Merchant not found');
  const createdAt = range(from, to);
  let title = '';
  let columns: ExportColumn[] = [];
  let rows: ExportRow[] = [];

  if (type === 'orders') {
    title = 'الطلبات'; columns = [
      { header: 'رقم الطلب', key: 'orderNumber' }, { header: 'الحالة', key: 'status' }, { header: 'العميل', key: 'customerName', width: 24 }, { header: 'الهاتف', key: 'customerPhone' },
      { header: 'الإجمالي الفرعي', key: 'subtotal', ...moneyColumns }, { header: 'التوصيل', key: 'deliveryFee', ...moneyColumns }, { header: 'الخصم', key: 'discount', ...moneyColumns }, { header: 'الضريبة', key: 'tax', ...moneyColumns }, { header: 'الإجمالي', key: 'total', ...moneyColumns },
      { header: 'طريقة الدفع', key: 'paymentMethod' }, { header: 'طريقة الاستلام', key: 'deliveryMethod' }, { header: 'التاريخ', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.order.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(o => ({ orderNumber: o.orderNumber, status: o.status, customerName: o.customerName, customerPhone: o.customerPhone, subtotal: Number(o.subtotal), deliveryFee: Number(o.deliveryFee), discount: Number(o.discount), tax: Number(o.tax), total: Number(o.total), paymentMethod: o.paymentMethod, deliveryMethod: o.deliveryMethod, createdAt: o.createdAt }));
  } else if (type === 'products') {
    title = 'المنتجات'; columns = [
      { header: 'المنتج', key: 'name', width: 28 }, { header: 'التصنيف', key: 'category', width: 22 }, { header: 'SKU', key: 'sku' }, { header: 'الباركود', key: 'barcode' }, { header: 'السعر', key: 'price', ...moneyColumns }, { header: 'سعر المقارنة', key: 'compareAtPrice', ...moneyColumns }, { header: 'نشط', key: 'active' }, { header: 'تاريخ الإضافة', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.product.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, include: { category: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(p => ({ name: p.name, category: p.category.name, sku: p.sku, barcode: p.barcode, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null, active: p.isActive ? 'نعم' : 'لا', createdAt: p.createdAt }));
  } else if (type === 'inventory') {
    title = 'المخزون'; columns = [
      { header: 'المنتج', key: 'product', width: 28 }, { header: 'SKU', key: 'sku' }, { header: 'الفرع', key: 'branch', width: 22 }, { header: 'الكمية', key: 'quantity' }, { header: 'المحجوز', key: 'reserved' }, { header: 'المتاح', key: 'available' }, { header: 'حد التنبيه', key: 'threshold' }, { header: 'تتبع المخزون', key: 'tracked' }, { header: 'آخر تحديث', key: 'updatedAt', ...dateColumns },
    ];
    rows = (await prisma.inventoryItem.findMany({ where: { merchantId, ...(createdAt ? { updatedAt: createdAt } : {}) }, include: { product: { select: { name: true, sku: true } }, branch: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: LIMIT })).map(i => ({ product: i.product.name, sku: i.product.sku, branch: i.branch?.name, quantity: i.quantity, reserved: i.reservedQuantity, available: i.quantity - i.reservedQuantity, threshold: i.lowStockThreshold, tracked: i.trackInventory ? 'نعم' : 'لا', updatedAt: i.updatedAt }));
  } else if (type === 'customers') {
    title = 'العملاء'; columns = [
      { header: 'الاسم', key: 'name', width: 26 }, { header: 'الهاتف', key: 'phone' }, { header: 'البريد', key: 'email', width: 26 }, { header: 'العنوان', key: 'address', width: 32 }, { header: 'الشريحة', key: 'segment' }, { header: 'عدد الطلبات', key: 'orders' }, { header: 'إجمالي الإنفاق', key: 'spent', ...moneyColumns }, { header: 'آخر طلب', key: 'lastOrderAt', ...dateColumns }, { header: 'تاريخ الإضافة', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.customer.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(c => ({ name: c.name, phone: c.phone, email: c.email, address: c.address, segment: c.segment, orders: c.totalOrders, spent: Number(c.totalSpent), lastOrderAt: c.lastOrderAt, createdAt: c.createdAt }));
  } else if (type === 'transactions') {
    title = 'الحركات المالية'; columns = [
      { header: 'النوع', key: 'type' }, { header: 'الاتجاه', key: 'direction' }, { header: 'المبلغ', key: 'amount', ...moneyColumns }, { header: 'العملة', key: 'currency' }, { header: 'الوصف', key: 'description', width: 32 }, { header: 'المرجع', key: 'reference' }, { header: 'التاريخ', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.financialTransaction.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(t => ({ type: t.type, direction: t.direction, amount: Number(t.amount), currency: t.currency, description: t.description, reference: t.reference, createdAt: t.createdAt }));
  } else if (type === 'settlements') {
    title = 'التسويات'; columns = [
      { header: 'الحالة', key: 'status' }, { header: 'من', key: 'periodFrom', ...dateColumns }, { header: 'إلى', key: 'periodTo', ...dateColumns }, { header: 'الطلبات', key: 'orders' }, { header: 'الإجمالي', key: 'gross', ...moneyColumns }, { header: 'العمولة', key: 'commission', ...moneyColumns }, { header: 'الرسوم', key: 'fees', ...moneyColumns }, { header: 'الصافي', key: 'net', ...moneyColumns }, { header: 'تاريخ السداد', key: 'paidAt', ...dateColumns },
    ];
    rows = (await prisma.settlement.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(s => ({ status: s.status, periodFrom: s.periodFrom, periodTo: s.periodTo, orders: s.totalOrders, gross: Number(s.grossAmount), commission: Number(s.commission), fees: Number(s.fees), net: Number(s.netAmount), paidAt: s.paidAt }));
  } else if (type === 'affiliates') {
    title = 'المسوّقون بالعمولة'; columns = [
      { header: 'المسوّق', key: 'name', width: 26 }, { header: 'الهاتف', key: 'phone' }, { header: 'البريد', key: 'email', width: 26 }, { header: 'الرمز', key: 'code' }, { header: 'الحالة', key: 'status' }, { header: 'الزيارات', key: 'visits' }, { header: 'الطلبات المنسوبة', key: 'orders' }, { header: 'العمولات', key: 'commissions' }, { header: 'تاريخ الإضافة', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.storeAffiliate.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, include: { _count: { select: { visits: true, attributions: true, commissions: true } } }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(a => ({ name: a.name, phone: a.phone, email: a.email, code: a.code, status: a.status, visits: a._count.visits, orders: a._count.attributions, commissions: a._count.commissions, createdAt: a.createdAt }));
  } else if (type === 'affiliate-commissions') {
    title = 'عمولات المسوّقين'; columns = [
      { header: 'المسوّق', key: 'affiliate', width: 26 }, { header: 'الرمز', key: 'code' }, { header: 'رقم الطلب', key: 'orderNumber' }, { header: 'المبلغ', key: 'amount', ...moneyColumns }, { header: 'العملة', key: 'currency' }, { header: 'الحالة', key: 'status' }, { header: 'نهاية التعليق', key: 'holdUntil', ...dateColumns }, { header: 'مرجع السداد', key: 'paymentRef' }, { header: 'تاريخ السداد', key: 'paidAt', ...dateColumns }, { header: 'تاريخ الإنشاء', key: 'createdAt', ...dateColumns },
    ];
    rows = (await prisma.storeAffiliateCommission.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, include: { affiliate: { select: { name: true, code: true } }, order: { select: { orderNumber: true } } }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(c => ({ affiliate: c.affiliate.name, code: c.affiliate.code, orderNumber: c.order.orderNumber, amount: Number(c.amount), currency: c.currency, status: c.status, holdUntil: c.holdUntil, paymentRef: c.paymentRef, paidAt: c.paidAt, createdAt: c.createdAt }));
  } else {
    title = 'الفواتير'; columns = [
      { header: 'رقم الفاتورة', key: 'invoiceNumber' }, { header: 'رقم الطلب', key: 'orderNumber' }, { header: 'الحالة', key: 'status' }, { header: 'العميل', key: 'customerName', width: 26 }, { header: 'الهاتف', key: 'customerPhone' }, { header: 'الإجمالي', key: 'total', ...moneyColumns }, { header: 'العملة', key: 'currency' }, { header: 'تاريخ الإصدار', key: 'issuedAt', ...dateColumns }, { header: 'تاريخ السداد', key: 'paidAt', ...dateColumns },
    ];
    rows = (await prisma.invoice.findMany({ where: { merchantId, ...(createdAt ? { createdAt } : {}) }, include: { order: { select: { orderNumber: true } } }, orderBy: { createdAt: 'desc' }, take: LIMIT })).map(i => ({ invoiceNumber: i.invoiceNumber, orderNumber: i.order.orderNumber, status: i.status, customerName: i.customerName, customerPhone: i.customerPhone, total: Number(i.total), currency: i.currency, issuedAt: i.issuedAt, paidAt: i.paidAt }));
  }

  const buffer = await createWorkbook({ title, merchantName: merchant.name, columns, rows });
  return { buffer, count: rows.length, title, merchantName: merchant.name };
}
