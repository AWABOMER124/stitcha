import { notFound } from 'next/navigation';
import { getDistributorByIdAction } from '@/modules/admin/actions';
import Link from 'next/link';
import { DistributorDetailClient } from './_client';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'بانتظار الموافقة', cls: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700' },
};

const MERCHANT_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'معلق', cls: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'مغلق', cls: 'bg-stone-100 text-stone-600' },
};

export default async function DistributorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getDistributorByIdAction(id);
  if (!res.success) notFound();

  const d = res.data as any;
  const st = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;

  return (
    <div dir="rtl" className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/admin" className="hover:text-[var(--primary)]">الادمن</Link>
        <span>/</span>
        <Link href="/admin/distributors" className="hover:text-[var(--primary)]">الموزعون</Link>
        <span>/</span>
        <span>{d.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl font-black text-[var(--primary)]">
            {d.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{d.name}</h1>
            <p className="text-sm font-mono text-[var(--muted-foreground)] mt-0.5">{d.slug}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              {d.email && <span className="text-xs text-[var(--muted-foreground)]">{d.email}</span>}
            </div>
          </div>
        </div>
        <DistributorDetailClient distributorId={d.id} currentStatus={d.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{d._count.merchants}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">تاجر</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{d._count.drivers}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">سائق</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-center">
          <p className="text-3xl font-black text-[var(--foreground)]">{Number(d.commissionRate)}%</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">نسبة العمولة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">مستخدمو الموزع</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {d.users.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)] text-center">لا يوجد مستخدمون</p>
            ) : (
              d.users.map((u: any) => (
                <div key={u.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{u.user.name ?? '—'}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{u.user.email}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5">
                      {u.isOwner ? 'مالك' : 'مشرف'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Merchants */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--foreground)]">التجار ({d.merchants.length})</h3>
          </div>
          {d.merchants.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">لا يوجد تجار بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                    {['التاجر', 'الحالة', 'الطلبات', 'تاريخ الانضمام'].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {d.merchants.map((m: any) => {
                    const mst = MERCHANT_STATUS[m.status] ?? MERCHANT_STATUS.PENDING;
                    return (
                      <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--foreground)]">{m.name}</p>
                          <p className="text-xs font-mono text-[var(--muted-foreground)]">{m.slug}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${mst.cls}`}>{mst.label}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{m._count.orders}</td>
                        <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                          {new Date(m.createdAt).toLocaleDateString('ar-SD')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
