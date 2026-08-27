import { getAuthContext, requirePermission } from '@/lib/permissions';

const exports = [
  ['orders', 'الطلبات', 'حالات الطلبات، العملاء، الدفع، التوصيل والإجماليات'],
  ['products', 'المنتجات', 'التصنيفات والأسعار والأكواد وحالة النشر'],
  ['inventory', 'المخزون', 'الكميات والمحجوز والمتاح وحدود التنبيه والفروع'],
  ['customers', 'العملاء', 'بيانات التواصل والشرائح وعدد الطلبات والإنفاق'],
  ['transactions', 'الحركات المالية', 'الإيرادات والرسوم والعمولات والمراجع'],
  ['settlements', 'التسويات', 'الفترات والإجماليات والعمولات والصافي'],
  ['invoices', 'الفواتير', 'حالة الفاتورة والطلب والعميل والإجمالي والسداد'],
] as const;

export default async function ExportsPage() {
  const auth = await getAuthContext();
  requirePermission(auth, 'exports:download');
  return <div className="space-y-6" dir="rtl"><div><h1 className="text-2xl font-black">تصدير بيانات المتجر</h1><p className="text-sm text-[var(--muted-foreground)]">ملفات Excel منظمة وآمنة، وتشمل بيانات متجرك فقط. الحد الأقصى 10,000 سجل لكل ملف.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exports.map(([type,title,description]) => <article key={type} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl">📊</div><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-1 min-h-10 text-sm text-[var(--muted-foreground)]">{description}</p><a href={`/api/exports/${type}`} className="mt-4 block rounded-lg bg-[var(--primary)] px-4 py-2 text-center text-sm font-bold text-white">تنزيل Excel</a></article>)}</div><p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">يمكن إضافة نطاق زمني إلى رابط التصدير باستخدام from و to بصيغة YYYY-MM-DD. مثال: <span dir="ltr" className="font-mono">?from=2026-01-01&amp;to=2026-12-31</span></p></div>;
}
