import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { getMerchantTransactionsAction } from '@/modules/finance/actions';

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  ORDER_PAYMENT: { label: 'دفع طلب', icon: '🛒', color: 'text-emerald-600' },
  COMMISSION: { label: 'عمولة', icon: '📊', color: 'text-red-500' },
  REFUND: { label: 'استرداد', icon: '↩️', color: 'text-blue-600' },
  SUBSCRIPTION_FEE: { label: 'رسوم اشتراك', icon: '🔄', color: 'text-purple-600' },
  DELIVERY_FEE: { label: 'رسوم توصيل', icon: '🚚', color: 'text-amber-600' },
  ADJUSTMENT: { label: 'تعديل', icon: '✏️', color: 'text-gray-600' },
  PAYOUT: { label: 'صرف', icon: '💸', color: 'text-emerald-700' },
};

type Transaction = {
  id: string;
  type: string;
  direction: string;
  amount: number | string;
  currency: string;
  description?: string | null;
  reference?: string | null;
  createdAt: string | Date;
};

type PageData = {
  data: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const type = sp.type ?? '';

  const res = await getMerchantTransactionsAction({ page, limit: 25, type: type || undefined });
  const result = res.success ? (res.data as PageData) : { data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
            <Link href="/dashboard/finance" className="hover:text-[var(--primary)]">المالية</Link>
            <span>/</span>
            <span>سجل المعاملات</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">سجل المعاملات</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            جميع الحركات المالية لمتجرك — {result.pagination.total} معاملة
          </p>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip href={`/dashboard/finance/transactions`} label="الكل" active={!type} />
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <FilterChip
            key={key}
            href={`/dashboard/finance/transactions?type=${key}`}
            label={cfg.label}
            active={type === key}
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {result.data.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-sm font-medium text-[var(--foreground)]">لا توجد معاملات</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              ستظهر هنا معاملاتك المالية بمجرد تنفيذ الطلبات
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['النوع', 'الوصف', 'المرجع', 'المبلغ', 'التاريخ'].map((h) => (
                    <th
                      key={h}
                      className="py-3 px-4 text-right font-medium text-[var(--muted-foreground)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.data.map((tx) => {
                  const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, icon: '💰', color: 'text-gray-600' };
                  const amt = Number(tx.amount);
                  const isCredit = tx.direction === 'CREDIT';
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cfg.icon}</span>
                          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                            isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted-foreground)] max-w-xs truncate">
                        {tx.description ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-[var(--muted-foreground)]">
                        {tx.reference ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isCredit ? 'text-emerald-600' : 'text-red-600'}>
                          {isCredit ? '+' : '-'}{fmt(amt)} {tx.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('ar-SD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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
        {result.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              صفحة {result.pagination.page} من {result.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/finance/transactions?page=${page - 1}${type ? `&type=${type}` : ''}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  السابق
                </Link>
              )}
              {page < result.pagination.totalPages && (
                <Link
                  href={`/dashboard/finance/transactions?page=${page + 1}${type ? `&type=${type}` : ''}`}
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

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-[var(--primary)] text-white'
          : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
      }`}
    >
      {label}
    </Link>
  );
}
