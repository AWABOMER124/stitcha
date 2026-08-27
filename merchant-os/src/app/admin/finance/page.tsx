import Link from 'next/link';
import { getPlatformFinanceStatsAction } from '@/modules/admin/actions';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

type FinanceStats = {
  platformRevenue: number;
  monthPlatformRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
  grossMerchandiseValue: number;
  deliveredOrders: number;
};

function money(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default async function AdminFinancePage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.FINANCE_READ);
  const result = await getPlatformFinanceStatsAction();
  const stats = result.success ? result.data as FinanceStats : null;

  const cards = [
    ['💰', 'إيراد اشتراكات وصلة', `${money(stats?.platformRevenue ?? 0)} SDG`, 'إجمالي المدفوعات التي تمت مطابقتها'],
    ['📅', 'إيراد هذا الشهر', `${money(stats?.monthPlatformRevenue ?? 0)} SDG`, 'اشتراكات تمت مطابقتها خلال الشهر'],
    ['⏳', 'تحويلات تنتظر المراجعة', String(stats?.pendingPayments ?? 0), 'تحتاج مطابقة من فريق المالية'],
    ['⭐', 'اشتراكات نشطة', String(stats?.activeSubscriptions ?? 0), 'التجار ذوو الاشتراك النشط'],
    ['🛍️', 'قيمة مبيعات المتاجر', `${money(stats?.grossMerchandiseValue ?? 0)} SDG`, 'مؤشر GMV للطلبات المسلّمة'],
    ['📦', 'طلبات تم تسليمها', String(stats?.deliveredOrders ?? 0), 'عبر جميع متاجر المنصة'],
  ];

  return <div className="space-y-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-bold">مالية منصة وصلة</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">إيرادات الاشتراكات ومؤشرات حركة المتاجر، بدون عمولات موزعين.</p></div>
      <Link href="/admin/subscription-payments" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">مراجعة التحويلات</Link>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([icon,label,value,note], index)=><article key={label} className={`rounded-2xl border bg-[var(--card)] p-5 shadow-sm ${index===2 && Number(stats?.pendingPayments ?? 0)>0?'border-amber-300':'border-[var(--border)]'}`}><div className="text-2xl">{icon}</div><p className="mt-4 text-xs font-semibold text-[var(--muted-foreground)]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-2 text-xs text-[var(--muted-foreground)]">{note}</p></article>)}</div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"><h2 className="font-bold">ملاحظة مالية</h2><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">قيمة مبيعات المتاجر ليست إيراداً لوصلة؛ هي مؤشر على نشاط التجار. إيراد وصلة في هذه المرحلة يأتي من الاشتراكات الاحترافية التي تمت مطابقتها فقط.</p></div>
  </div>;
}
