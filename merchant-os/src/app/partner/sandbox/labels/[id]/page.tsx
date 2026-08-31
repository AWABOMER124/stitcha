import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { PrintSandboxLabel } from '@/components/partner/print-label';
export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { partnerId } = await requireDeliveryPartner();
  const row = await prisma.partnerSandboxShipment.findFirst({ where: { id: (await params).id, store: { partnerId } }, include: { store: { select: { name: true } } } });
  if (!row) notFound();
  return <article dir="rtl" className="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-white p-8 text-slate-950 print:border-0"><p className="text-2xl font-black text-red-700">TEST — غير صالحة للشحن الفعلي</p><h1 className="text-xl font-black">بوليصة اختبار وصلة</h1><p>{row.store.name}</p><p dir="ltr" className="break-all font-mono">{row.trackingCode}</p><p>الحالة: {row.status === 'CANCELLED' ? 'ملغاة — لا تستخدم' : row.status}</p><p>من: فرع تجريبي · إلى: عميل تجريبي</p><p>طرد اختباري × 2 · القيمة الافتراضية: 1,000 SDG</p><p className="text-sm">هذه وثيقة محاكاة وليست بوليصة صادرة من شركة شحن، ولا يترتب عليها تحصيل أو التزام توصيل.</p><PrintSandboxLabel /></article>;
}
