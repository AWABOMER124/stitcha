'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createDistributorAction,
  updateDistributorStatusAction,
} from '@/modules/admin/actions';

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING: { label: 'بانتظار الموافقة', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

type DistributorRow = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  commissionRate: number | string;
  createdAt: string | Date;
  _count: { merchants: number; drivers: number };
};

export function DistributorsClient({
  initialData,
  pagination,
  initialSearch,
  initialPage,
}: {
  initialData: DistributorRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  initialSearch: string;
  initialPage: number;
}) {
  const router = useRouter();
  const [distributors, setDistributors] = useState(initialData);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [search, setSearch] = useState(initialSearch);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    commissionRate: '5',
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/admin/distributors?search=${encodeURIComponent(search)}`);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createDistributorAction({
        name: form.name,
        slug: form.slug,
        email: form.email || undefined,
        phone: form.phone || undefined,
        commissionRate: Number(form.commissionRate),
      });
      if (res.success) {
        setDistributors((prev) => [res.data as DistributorRow, ...prev]);
        setShowForm(false);
        setForm({ name: '', slug: '', email: '', phone: '', commissionRate: '5' });
      } else {
        setError(res.error);
      }
    });
  }

  function handleStatusChange(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    startTransition(async () => {
      const res = await updateDistributorStatusAction(id, status);
      if (res.success) {
        setDistributors((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status } : d)),
        );
      }
    });
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  return (
    <div className="space-y-4">
      {/* Search + Create */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--muted)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--border)] transition-colors"
          >
            بحث
          </button>
        </form>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          + موزع جديد
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-5">إضافة موزع جديد</h3>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">اسم الموزع *</label>
              <input
                required
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }));
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">الـ Slug *</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">رقم الهاتف</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">نسبة العمولة (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.commissionRate}
                onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            <div className="col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending ? 'جارٍ الإنشاء...' : 'إنشاء الموزع'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {distributors.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm font-medium text-[var(--foreground)]">لا يوجد موزعون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['الموزع', 'الحالة', 'التجار', 'السائقون', 'العمولة', 'تاريخ الانضمام', 'إجراء'].map((h) => (
                    <th key={h} className="py-3 px-4 text-right font-medium text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {distributors.map((d) => {
                  const st = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <tr key={d.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-sm font-black text-[var(--primary)]">
                            {d.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">{d.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)] font-mono">{d.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--foreground)]">{d._count.merchants}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--foreground)]">{d._count.drivers}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[var(--foreground)]">{Number(d.commissionRate)}%</td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)]">
                        {new Date(d.createdAt).toLocaleDateString('ar-SD')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/distributors/${d.id}`}
                            className="text-xs font-medium text-[var(--primary)] hover:underline"
                          >
                            عرض
                          </Link>
                          {d.status === 'PENDING' && (
                            <button
                              onClick={() => handleStatusChange(d.id, 'ACTIVE')}
                              disabled={isPending}
                              className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                            >
                              موافقة
                            </button>
                          )}
                          {d.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleStatusChange(d.id, 'SUSPENDED')}
                              disabled={isPending}
                              className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                            >
                              إيقاف
                            </button>
                          )}
                          {d.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleStatusChange(d.id, 'ACTIVE')}
                              disabled={isPending}
                              className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                            >
                              تفعيل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              صفحة {pagination.page} من {pagination.totalPages} — {pagination.total} موزع
            </p>
            <div className="flex gap-2">
              {initialPage > 1 && (
                <Link
                  href={`/admin/distributors?page=${initialPage - 1}${initialSearch ? `&search=${initialSearch}` : ''}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
                >
                  السابق
                </Link>
              )}
              {initialPage < pagination.totalPages && (
                <Link
                  href={`/admin/distributors?page=${initialPage + 1}${initialSearch ? `&search=${initialSearch}` : ''}`}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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
