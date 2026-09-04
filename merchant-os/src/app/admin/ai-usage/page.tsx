import { AI_FEATURE_CATALOG, getPlatformAiUsageOverview } from '@/modules/ai-usage';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';

export const dynamic = 'force-dynamic';

export default async function AdminAiUsagePage() {
  await requirePlatformPermission(PLATFORM_PERMISSIONS.FINANCE_READ);
  const overview = await getPlatformAiUsageOverview();
  const labels = new Map<string, string>(AI_FEATURE_CATALOG.map(item => [item.key, item.labelAr]));

  return <div className="mx-auto max-w-7xl space-y-6" dir="rtl">
    <header>
      <h1 className="text-2xl font-black">استخدام وتكلفة الذكاء الاصطناعي</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">متابعة حصص التجار وعمليات المزود والتكلفة التقديرية خلال الشهر الحالي.</p>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="العمليات" value={overview.totalOperations.toLocaleString()} />
      <Metric label="توكنات الإدخال" value={overview.inputTokens.toLocaleString()} />
      <Metric label="توكنات الإخراج" value={overview.outputTokens.toLocaleString()} />
      <Metric label="التكلفة التقديرية" value={`$${overview.estimatedCostUsd.toFixed(4)}`} />
    </section>

    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] p-5"><h2 className="font-black">توزيع العمليات</h2></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--muted)] text-[var(--muted-foreground)]"><tr><th className="p-3 text-right">الميزة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">العدد</th></tr></thead><tbody>{overview.breakdown.map(row => <tr key={`${row.featureKey}:${row.status}`} className="border-t border-[var(--border)]"><td className="p-3 font-semibold">{labels.get(row.featureKey) ?? row.featureKey}</td><td className="p-3">{statusLabel(row.status)}</td><td className="p-3">{row._count._all.toLocaleString()}</td></tr>)}</tbody></table></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="border-b border-[var(--border)] p-5"><h2 className="font-black">أحدث العمليات</h2></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--muted)] text-[var(--muted-foreground)]"><tr><th className="p-3 text-right">التاجر</th><th className="p-3 text-right">الميزة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">المزود</th><th className="p-3 text-right">التكلفة</th><th className="p-3 text-right">الوقت</th></tr></thead><tbody>{overview.recent.map(item => <tr key={item.id} className="border-t border-[var(--border)]"><td className="p-3 font-semibold">{item.merchant.name}</td><td className="p-3">{labels.get(item.featureKey) ?? item.featureKey}</td><td className="p-3">{statusLabel(item.status)}</td><td className="p-3">{item.provider ?? '—'}</td><td className="p-3">${item.estimatedCostUsd.toFixed(4)}</td><td className="p-3 whitespace-nowrap">{item.createdAt.toLocaleString('ar-SD')}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"><p className="text-sm text-[var(--muted-foreground)]">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>;
}

function statusLabel(status: string) {
  if (status === 'COMMITTED') return 'مكتملة';
  if (status === 'RESERVED') return 'قيد التنفيذ';
  if (status === 'RELEASED') return 'محررة';
  if (status === 'EXPIRED') return 'منتهية';
  return status;
}
