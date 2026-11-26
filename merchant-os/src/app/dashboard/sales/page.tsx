import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { getAuthContext } from '@/lib/permissions';
import { getPublicOrigin } from '@/lib/public-origin';
import { salesAccess } from '@/modules/assisted-sales/service';
import { getMerchantOnlinePaymentStatus } from '@/modules/paymob-payments/market-payments.service';
import { quoteState, type QuoteItem } from '@/modules/assisted-sales/policy';
import { SalesWorkspace } from './workspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'المبيعات الخاصة | وصلة' };

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const auth = await getAuthContext();
  const access = await salesAccess(auth).catch(error => ({ error: error instanceof Error ? error.message : 'غير متاح' }));
  if ('error' in access) return <div className="mx-auto max-w-xl rounded-3xl border bg-[var(--card)] p-8 text-center"><p className="text-sm font-bold text-[var(--primary)]">أدوات فريق المبيعات</p><h1 className="my-4 text-2xl font-black">حوّل اتفاق واتساب إلى طلب مدفوع</h1><p className="mb-6 text-[var(--muted-foreground)]">{access.error}</p><Link className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white" href="/dashboard/subscription">إدارة الباقة</Link></div>;
  const query = await searchParams;
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page ?? '1') || 1));
  const search = (query.q ?? '').slice(0, 120);
  const scope: Prisma.SalesQuoteWhereInput = { merchantId: auth.merchantId,
    ...(!access.canViewAll ? { OR: [{ createdById: auth.userId }, ...(access.canApprove ? [{ status: 'PENDING_APPROVAL' }] : [])] } : {}) };
  const where: Prisma.SalesQuoteWhereInput = { AND: [scope,
    ...(search ? [{ OR: [{ customerName: { contains: search, mode: 'insensitive' as const } }, { customerPhone: { contains: search } }] }] : []),
    ...(['OPEN', 'PENDING_APPROVAL', 'CANCELLED', 'CONVERTED'].includes(query.status ?? '') ? [{ status: query.status }] : []),
  ] };
  const [quotes, total, products, staff, merchant, gateway, origin] = await Promise.all([
    prisma.salesQuote.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30,
      include: { order: { select: { id: true, status: true, orderNumber: true, payment: { select: { status: true } } } }, events: { orderBy: { createdAt: 'desc' }, take: 8 } } }),
    prisma.salesQuote.count({ where }),
    prisma.product.findMany({ where: { merchantId: auth.merchantId, isActive: true }, select: { id: true, name: true, price: true, sku: true }, orderBy: { name: 'asc' }, take: 5000 }),
    prisma.merchantUser.findMany({ where: { merchantId: auth.merchantId, isActive: true }, select: { userId: true, user: { select: { name: true, email: true } } } }),
    prisma.merchant.findUniqueOrThrow({ where: { id: auth.merchantId }, select: { name: true, currency: true } }),
    getMerchantOnlinePaymentStatus(auth.merchantId), getPublicOrigin(),
  ]);
  return <SalesWorkspace settings={access.settings} owner={access.owner} canApprove={access.canApprove} canCreate={access.owner || auth.permissions.includes('orders:create')}
    userId={auth.userId} discountLimit={access.discountLimit} gatewayReady={gateway.ready} storeName={merchant.name} currency={merchant.currency} origin={origin}
    products={products.map(p => ({ ...p, price: Number(p.price) }))} staff={staff.map(s => ({ userId: s.userId, name: s.user.name || s.user.email }))}
    quotes={quotes.map(q => ({ id: q.id, version: q.version, createdById: q.createdById, customerName: q.customerName, customerPhone: q.customerPhone,
      items: q.items as unknown as QuoteItem[], subtotal: Number(q.subtotal), deliveryFee: Number(q.deliveryFee), total: Number(q.total), currency: q.currency,
      discountPercent: Number(q.discountPercent), paymentMethod: q.paymentMethod as 'ONLINE' | 'CASH', deliveryMethod: q.deliveryMethod as 'PICKUP' | 'MERCHANT_DELIVERY',
      notes: q.notes ?? '', status: q.status, state: quoteState(q), token: q.status === 'OPEN' || q.orderId ? q.token : null,
      expiresAt: q.expiresAt.toISOString(), createdAt: q.createdAt.toISOString(), order: q.order,
      events: q.events.map(e => ({ id: e.id, type: e.type, actorId: e.actorId, at: e.createdAt.toISOString() })) }))}
    total={total} page={page} search={search} status={query.status ?? ''} />;
}
