import Link from 'next/link';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { ArrowLeft, Check, Circle, MapPinned, PackageCheck, PlugZap, Store, Truck } from 'lucide-react';

export default async function PartnerDashboard() {
  const { partnerId, verified } = await requireDeliveryPartner();
  const partner = await prisma.deliveryPartner.findUniqueOrThrow({ where: { id: partnerId }, include: { providerConfig: true, _count: { select: { serviceAreas:true,pricingRules:true,couriers:true,shipments:true,merchantConnections:true } } } });
  const activeShipments = await prisma.platformShipment.count({ where: { partnerId, status: { in: ['REQUESTED','ASSIGNED','PICKED_UP','IN_TRANSIT'] } } });
  const cards = [
    { label: 'متاجر متصلة', value: partner._count.merchantConnections, icon: Store, tone: 'bg-blue-50 text-blue-700' },
    { label: 'شحنات نشطة', value: activeShipments, icon: PackageCheck, tone: 'bg-amber-50 text-amber-700' },
    { label: 'مناطق الخدمة', value: partner._count.serviceAreas, icon: MapPinned, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'مندوبون', value: partner._count.couriers, icon: Truck, tone: 'bg-violet-50 text-violet-700' },
  ];
  const readiness = [
    { label: 'تأكيد البريد أو واتساب', ready: verified, href: '/partner/security' },
    { label: 'بيانات التطبيق والشعار', ready: !!(partner.appName && partner.appDescription && partner.appIcon), href: '/partner/settings' },
    { label: 'منطقة خدمة نشطة', ready: partner._count.serviceAreas > 0, href: '/partner/coverage' },
    { label: 'قاعدة تسعير نشطة', ready: partner._count.pricingRules > 0, href: '/partner/coverage' },
    { label: 'بيانات اعتماد وربط إنتاج', ready: !!(partner.providerConfig?.isActive && (partner.providerConfig.integrationMode === 'APP_V1'
      ? partner.providerConfig.clientId && partner.providerConfig.clientSecretHash && partner.providerConfig.outboundWebhookUrl && partner.providerConfig.webhookSigningSecret
      : partner.providerConfig.apiBaseUrl && partner.providerConfig.credentials)), href: '/partner/settings' },
    { label: 'اعتماد ونشر التطبيق', ready: partner.status === 'ACTIVE' && partner.appStatus === 'PUBLISHED', href: '/partner/settings' },
  ];
  const readyCount = readiness.filter(item => item.ready).length;
  const completion = Math.round((readyCount / readiness.length) * 100);
  return <div className="mx-auto max-w-7xl space-y-6" dir="rtl">
    <section className="overflow-hidden rounded-3xl bg-[#07111f] p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" />{partner.status === 'ACTIVE' ? 'شريك نشط' : 'قيد مراجعة وصلة'}</span><h1 className="mt-4 text-2xl font-black sm:text-3xl">مرحباً، {partner.name}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">شغّل تطبيق التوصيل، اختبر التكامل، وتابع الشحنات والتغطية من مساحة عمل واحدة.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/partner/settings" className="rounded-xl bg-[#13c4a3] px-4 py-3 text-sm font-black text-[#07111f]">إدارة التطبيق</Link><Link href="/partner/docs" className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold hover:bg-white/10">دليل الربط</Link></div>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon: Icon,tone})=><div key={label} className="rounded-2xl border bg-white p-5 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-600">{label}</p><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span></div><p className="mt-5 text-3xl font-black">{Number(value).toLocaleString('ar')}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <section className="rounded-2xl border bg-white p-6 shadow-sm shadow-slate-200/40"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">جاهزية الإطلاق</h2><p className="mt-1 text-sm text-slate-500">{readyCount} من {readiness.length} متطلبات مكتملة</p></div><span className="text-2xl font-black text-teal-700">{completion}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#13c4a3]" style={{width: `${completion}%`}} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{readiness.map(item => <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border p-4 hover:border-teal-300"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${item.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{item.ready ? <Check className="size-4" /> : <Circle className="size-4" />}</span><span className="flex-1 text-sm font-bold">{item.label}</span><ArrowLeft className="size-4 text-slate-400 group-hover:text-teal-700" /></Link>)}</div></section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm shadow-slate-200/40"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><PlugZap className="size-5" /></span><div><h2 className="font-black">حالة الربط</h2><p className="mt-1 text-xs text-slate-500">وصلة ↔ نظام شركة الشحن</p></div></div><div className="mt-5 space-y-3 text-sm"><Status label="هوية التطبيق" ready={!!partner.providerConfig?.clientId} /><Status label="Webhook الشركة" ready={!!partner.providerConfig?.outboundWebhookUrl} /><Status label="الربط مفعل" ready={!!partner.providerConfig?.isActive} /></div><Link href="/partner/settings" className="mt-5 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black hover:border-teal-300 hover:text-teal-700">فتح إعدادات التكامل <ArrowLeft className="size-4" /></Link></section>
    </div>
    {partner.status==='PENDING'&&<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><p className="font-black">الحساب قيد المراجعة</p><p className="mt-1 text-sm leading-6">يمكنك تجهيز التطبيق والتغطية والأسعار واختبار التكامل الآن. سيظهر التطبيق للتجار بعد اعتماد وصلة ونشره.</p></div>}
  </div>;
}

function Status({label, ready}: {label: string; ready: boolean}) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-bold text-slate-700">{label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-black ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{ready ? 'جاهز' : 'غير مكتمل'}</span></div>;
}
