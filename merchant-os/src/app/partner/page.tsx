import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';

export default async function PartnerDashboard() {
  const { partnerId, verified } = await requireDeliveryPartner();
  const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true, _count: { select: { serviceAreas:true,pricingRules:true,couriers:true,shipments:true,merchantConnections:true } } } });
  const activeShipments = await prisma.platformShipment.count({ where: { partnerId, status: { in: ['REQUESTED','ASSIGNED','PICKED_UP','IN_TRANSIT'] } } });
  const cards = [['متاجر متصلة',partner._count.merchantConnections],['شحنات نشطة',activeShipments],['مناطق الخدمة',partner._count.serviceAreas],['مندوبون',partner._count.couriers]];
  const readiness = [
    { label: 'تأكيد البريد أو واتساب', ready: verified, href: '/partner/security' },
    { label: 'بيانات التطبيق والشعار', ready: !!(partner.appName && partner.appDescription && partner.appIcon), href: '/partner/settings' },
    { label: 'منطقة خدمة نشطة', ready: partner._count.serviceAreas > 0, href: '/partner/coverage' },
    { label: 'قاعدة تسعير نشطة', ready: partner._count.pricingRules > 0, href: '/partner/coverage' },
    { label: 'API إنتاج ومفتاح ربط', ready: !!(partner.providerConfig?.isActive && partner.providerConfig.apiBaseUrl && partner.providerConfig.credentials), href: '/partner/settings' },
    { label: 'اعتماد ونشر التطبيق', ready: partner.status === 'ACTIVE' && partner.appStatus === 'PUBLISHED', href: '/partner/settings' },
  ];
  const readyCount = readiness.filter(item => item.ready).length;
  return <div className="space-y-7" dir="rtl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[var(--primary)]">{partner.name}</p><h1 className="mt-1 text-3xl font-black">لوحة تشغيل الشريك</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">حالة الحساب: {partner.status} · حالة التطبيق: {partner.appStatus}</p></div><Link href="/partner/settings" className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white">إكمال بيانات التطبيق</Link></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black">{Number(value).toLocaleString()}</p></div>)}</div><section className="rounded-2xl border bg-[var(--card)] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">جاهزية الإطلاق</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{readyCount} من {readiness.length} متطلبات مكتملة</p></div><Link href="/partner/docs#errors" className="rounded-xl border px-4 py-2 text-sm font-bold">قائمة اختبار الربط</Link></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{readiness.map(item => <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl border p-4"><span className={`grid size-7 place-items-center rounded-full text-sm font-black ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{item.ready ? '✓' : '!'}</span><span className="font-bold">{item.label}</span></Link>)}</div></section>{partner.status==='PENDING'&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-bold">الحساب قيد المراجعة</p><p className="mt-1 text-sm">يمكنك تجهيز التطبيق والتغطية والأسعار الآن. سيظهر التطبيق للتجار بعد اعتماد وصلة ونشره.</p></div>}</div>;
}
