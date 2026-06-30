import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getDriverAction, getDriverEarningsAction } from '@/modules/drivers/actions';

const EARNING_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  DELIVERY: { label: 'أجر توصيل', icon: '🚚', color: 'text-emerald-600' },
  BONUS: { label: 'مكافأة', icon: '⭐', color: 'text-amber-600' },
  DEDUCTION: { label: 'خصم', icon: '📉', color: 'text-red-600' },
  TIP: { label: 'إكرامية', icon: '💝', color: 'text-pink-600' },
  PAYOUT: { label: 'صرف', icon: '💸', color: 'text-blue-600' },
};

type Earning = {
  id: string;
  amount: number | string;
  currency: string;
  type: string;
  description?: string | null;
  orderId?: string | null;
  createdAt: string | Date;
};

type EarningsData = {
  data: Earning[];
  total: number;
  pagination: { page: number; limit: number; count: number; totalPages: number };
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DriverEarningsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const { id } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);

  const [driverRes, earningsRes] = await Promise.all([
    getDriverAction(id),
    getDriverEarningsAction(id, page, 30),
  ]);

  if (!driverRes.success) notFound();
  const driver = driverRes.data as { id: string; name: string; currency?: string };
  const earningsData = earningsRes.success
    ? (earningsRes.data as EarningsData)
    : { data: [], total: 0, pagination: { page: 1, limit: 30, count: 0, totalPages: 1 } };

  const cur = driver.currency ?? 'SDG';
  const earnings = earningsData.data;

  // Group by type for summary
  const byType: Record<string, number> = {};
  earnings.forEach((e) => {
    byType[e.type] = (byType[e.type] ?? 0) + Number(e.amount);
  });

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/distributor/drivers" className="hover:text-[var(--primary)]">السائقون</Link>
        <span>/</span>
        <Link href={`/distributor/drivers/${id}`} className="hover:text-[var(--primary)]">{driver.name}</Link>
        <span>/</span>
        <span>الأرباح والمستحقات</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">أرباح {driver.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            إجمالي {earningsData.pagination.count} حركة مالية
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-[var(--muted-foreground)]">الإجمالي الكلي</p>
          <p className="text-2xl font-black text-emerald-600">
            {fmt(earningsData.total)} <span className="text-sm font-normal text-[var(--muted-foreground)]">{cur}</span>
          </p>
        </div>
      </div>

      {/* Type summary */}
      {Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(byType).map(([type, total]) => {
            const cfg = EARNING_TYPE_CONFIG[type] ?? { label: type, icon: '💰', color: 'text-gray-600' };
            return (
              <div key={type} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                <span className="text-2xl block mb-1">{cfg.icon}</span>
                <p className="text-xs text-[var(--muted-foreground)]">{cfg.label}</p>
                <p className={`text-lg font-black mt-1 ${cfg.color}`}>{fmt(total)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Earnings list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {earnings.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-sm font-medium text-[var(--foreground)]">لا توجد أرباح مسجلة</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">ستظهر هنا أرباح السائق بمجرد إتمام طلبات التوصيل</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['النوع', 'الوصف', 'الطلب', 'المبلغ', 'التاريخ'].map((h) => (
                    <th
                      key={h}
                      className="py-3 px-4 text-right font-medium text-[var(--muted-foreground)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {earnings.map((e) => {
                  const cfg = EARNING_TYPE_CONFIG[e.type] ?? { label: e.type, icon: '💰', color: 'text-gray-600' };
                  const amt = Number(e.amount);
                  const isDeduction = e.type === 'DEDUCTION' || e.type === 'PAYOUT';
                  return (
                    <tr key={e.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <span className="text-xs font-semibold text-[var(--foreground)]">{cfg.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted-foreground)] max-w-xs truncate">
                        {e.description ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[var(--muted-foreground)]">
                        {e.orderId ? (
                          <span className="bg-[var(--muted)] rounded px-2 py-0.5">{e.orderId.slice(-8)}</span>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isDeduction ? 'text-red-600' : cfg.color}>
                          {isDeduction ? '−' : '+'}{fmt(amt)} {e.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleDateString('ar-SD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {earningsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              صفحة {earningsData.pagination.page} من {earningsData.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/distributor/drivers/${id}/earnings?page=${page - 1}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  السابق
                </Link>
              )}
              {page < earningsData.pagination.totalPages && (
                <Link
                  href={`/distributor/drivers/${id}/earnings?page=${page + 1}`}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  التالي
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
