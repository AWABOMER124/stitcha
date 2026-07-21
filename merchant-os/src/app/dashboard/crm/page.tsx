import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getCustomerStatsAction, getAllCustomersAction } from '@/modules/crm/actions';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import Link from 'next/link';
import type { CrmCustomer } from './customers/_client';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].crmPage;

  const [statsRes, customersRes] = await Promise.all([
    getCustomerStatsAction(),
    getAllCustomersAction(),
  ]);

  const stats = statsRes.success ? (statsRes.data as {
    totalCustomers: number; newCustomers: number; regularCustomers: number;
    vipCustomers: number; inactiveCustomers: number; totalRevenue: number;
  }) : null;

  const recentCustomers = customersRes.success ? (customersRes.data as CrmCustomer[]).slice(0, 8) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{t.subtitle}</p>
        </div>
        <Link href="/dashboard/crm/customers"
          className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors">
          {t.allCustomers}
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">{t.totalCustomers}</p>
            <p className="text-3xl font-black text-[var(--foreground)]">{stats.totalCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-amber-50 p-5">
            <p className="text-xs text-amber-600 mb-1">{t.vip}</p>
            <p className="text-3xl font-black text-amber-700">{stats.vipCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-indigo-50 p-5">
            <p className="text-xs text-indigo-600 mb-1">{t.regular}</p>
            <p className="text-3xl font-black text-indigo-700">{stats.regularCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-stone-50 p-5">
            <p className="text-xs text-stone-500 mb-1">{t.inactive}</p>
            <p className="text-3xl font-black text-stone-600">{stats.inactiveCustomers}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/crm/customers"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">👥</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">{t.customersTitle}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.customersDesc}</p>
        </Link>
        <Link href="/dashboard/crm/promos"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">🎟️</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">{t.promosTitle}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.promosDesc}</p>
        </Link>
        <Link href="/dashboard/crm/loyalty"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">⭐</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">{t.loyaltyTitle}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.loyaltyDesc}</p>
        </Link>
      </div>

      {recentCustomers.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-bold text-[var(--foreground)]">{t.topCustomers}</h3>
            <Link href="/dashboard/crm/customers" className="text-xs text-[var(--primary)] hover:underline">{t.viewAll}</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentCustomers.map((c) => {
              const seg = SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG];
              return (
                <Link key={c.id} href={`/dashboard/crm/customers/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--muted)]/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-black text-[var(--primary)]">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--foreground)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.totalOrders} {t.ordersSuffix}</p>
                  </div>
                  <div className="text-left">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${seg?.bg} ${seg?.color}`}>{seg?.label}</span>
                    <p className="text-xs font-mono font-bold text-[var(--foreground)] mt-1 text-left">{Number(c.totalSpent).toFixed(0)} SDG</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
