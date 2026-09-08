import prisma from '@/lib/db/prisma';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { createWorkbook } from '@/modules/exports/excel';

export const runtime = 'nodejs';
export async function GET() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.MERCHANTS_READ);
  const merchants = await prisma.merchant.findMany({ include: { subscription: { include: { plan: { select: { name: true } } } }, _count: { select: { orders: true, products: true, customers: true, branches: true } } }, orderBy: { createdAt: 'desc' } });
  const buffer = await createWorkbook({ title: 'التجار', merchantName: 'وصلة', columns: [{ header: 'اسم المتجر', key: 'name', width: 28 }, { header: 'الرابط', key: 'url', width: 28 }, { header: 'الهاتف', key: 'phone', width: 18 }, { header: 'البريد', key: 'email', width: 28 }, { header: 'الحالة', key: 'status' }, { header: 'الباقة', key: 'plan', width: 18 }, { header: 'الطلبات', key: 'orders' }, { header: 'المنتجات', key: 'products' }, { header: 'العملاء', key: 'customers' }, { header: 'الفروع', key: 'branches' }, { header: 'تاريخ الانضمام', key: 'joined', width: 18 }], rows: merchants.map(m => ({ name: m.name, url: `/store/${m.slug}`, phone: m.phone, email: m.email, status: m.status, plan: m.subscription?.plan.name ?? 'الأساسية', orders: m._count.orders, products: m._count.products, customers: m._count.customers, branches: m._count.branches, joined: m.createdAt })) });
  const filename = `wasla-merchants-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
