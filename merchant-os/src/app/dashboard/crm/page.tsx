import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getCustomerStatsAction, getAllCustomersAction } from '@/modules/crm/actions';
import { SEGMENT_CONFIG } from '@/modules/crm/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [statsRes, customersRes] = await Promise.all([
    getCustomerStatsAction(),
    getAllCustomersAction(),
  ]);

  const stats = statsRes.success ? (statsRes.data as {
    totalCustomers: number; newCustomers: number; regularCustomers: number;
    vipCustomers: number; inactiveCustomers: number; totalRevenue: number;
  }) : null;

  const recentCustomers = customersRes.success ? (customersRes.data as any[]).slice(0, 8) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">إدارة العملاء</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">قاعدة عملائك · الخصومات · الولاء</p>
        </div>
        <Link href="/dashboard/crm/customers"
          className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors">
          كل العملاء
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">إجمالي العملاء</p>
            <p className="text-3xl font-black text-[var(--foreground)]">{stats.totalCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-amber-50 p-5">
            <p className="text-xs text-amber-600 mb-1">VIP</p>
            <p className="text-3xl font-black text-amber-700">{stats.vipCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-indigo-50 p-5">
            <p className="text-xs text-indigo-600 mb-1">منتظمون</p>
            <p className="text-3xl font-black text-indigo-700">{stats.regularCustomers}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-stone-50 p-5">
            <p className="text-xs text-stone-500 mb-1">غير نشطين</p>
            <p className="text-3xl font-black text-stone-600">{stats.inactiveCustomers}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/crm/customers"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">👥</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">العملاء</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">عرض وإدارة قاعدة عملائك</p>
        </Link>
        <Link href="/dashboard/crm/promos"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">🎟️</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">أكواد الخصم</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">إنشاء وإدارة عروض الخصم</p>
        </Link>
        <Link href="/dashboard/crm/loyalty"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)]/40 transition-colors group">
          <p className="text-2xl mb-3">⭐</p>
          <p className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">نقاط الولاء</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">برنامج مكافأة العملاء المميزين</p>
        </Link>
      </div>

      {recentCustomers.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-bold text-[var(--foreground)]">أفضل العملاء</h3>
            <Link href="/dashboard/crm/customers" className="text-xs text-[var(--primary)] hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentCustomers.map((c: any) => {
              const seg = SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG];
              return (
                <Link key={c.id} href={`/dashboard/crm/customers/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--muted)]/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-black text-[var(--primary)]">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--foreground)] truncate">{c.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.totalOrders} طلب</p>
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
