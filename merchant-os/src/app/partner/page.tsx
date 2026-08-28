import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';

export default async function PartnerDashboard() {
  const { partnerId } = await requireDeliveryPartner();
  const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { _count: { select: { serviceAreas:true,pricingRules:true,couriers:true,shipments:true,merchantConnections:true } } } });
  const activeShipments = await prisma.platformShipment.count({ where: { partnerId, status: { in: ['REQUESTED','ASSIGNED','PICKED_UP','IN_TRANSIT'] } } });
  const cards = [['متاجر متصلة',partner._count.merchantConnections],['شحنات نشطة',activeShipments],['مناطق الخدمة',partner._count.serviceAreas],['مندوبون',partner._count.couriers]];
  return <div className="space-y-7" dir="rtl"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-[var(--primary)]">{partner.name}</p><h1 className="mt-1 text-3xl font-black">لوحة تشغيل الشريك</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">حالة الحساب: {partner.status} · حالة التطبيق: {partner.appStatus}</p></div><Link href="/partner/settings" className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white">إكمال بيانات التطبيق</Link></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-3xl font-black">{Number(value).toLocaleString()}</p></div>)}</div>{partner.status==='PENDING'&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-bold">الحساب قيد المراجعة</p><p className="mt-1 text-sm">يمكنك تجهيز التطبيق والتغطية والأسعار الآن. سيظهر التطبيق للتجار بعد اعتماد وصلة ونشره.</p></div>}</div>;
}
