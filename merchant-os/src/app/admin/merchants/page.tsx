import { getAllMerchantsAction } from '@/modules/admin/actions';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'معلق', cls: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'موقوف', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'مغلق', cls: 'bg-stone-100 text-stone-600' },
};

const BUSINESS_LABELS: Record<string, string> = {
  RESTAURANT: 'مطعم',
  GROCERY: 'بقالة',
  PHARMACY: 'صيدلية',
  ELECTRONICS: 'إلكترونيات',
  FASHION: 'أزياء',
  FLOWERS: 'زهور',
  BAKERY: 'مخبز',
  OTHER: 'أخرى',
};

type Merchant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  businessType: string;
  email?: string | null;
  createdAt: string | Date;
  distributor?: { id: string; name: string } | null;
  _count: { orders: number; products: number };
};

type PageData = {
  data: Merchant[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? '';
  const status = sp.status ?? '';

  const res = await getAllMerchantsAction(page, 25, search || undefined, status || undefined);
  const result = res.success
    ? (res.data as PageData)
    : { data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } };

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">التجار</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {result.pagination.total} تاجر على المنصة
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'الكل', val: '' },
          { label: 'نشط', val: 'ACTIVE' },
          { label: 'معلق', val: 'PENDING' },
          { label: 'موقوف', val: 'SUSPENDED' },
        ].map((f) => (
          <Link
            key={f.val}
            href={`/admin/merchants?status=${f.val}${search ? `&search=${search}` : ''}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === f.val
                ? 'bg-[var(--primary)] text-white'
                : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {result.data.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="text-sm text-[var(--muted-foreground)]">لا يوجد تجار</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                  {['التاجر', 'النشاط', 'الموزع', 'الحالة', 'الطلبات', 'المنتجات', 'تاريخ التسجيل'].map((h) => (
                    <th key={h} className="py-3 px-4 text-right font-medium text-[var(--muted-foreground)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {result.data.map((m) => {
                  const st = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <tr key={m.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[var(--foreground)]">{m.name}</p>
                        <p className="text-xs font-mono text-[var(--muted-foreground)]">{m.slug}</p>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted-foreground)]">
                        {BUSINESS_LABELS[m.businessType] ?? m.businessType}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.distributor ? (
                          <Link
                            href={`/admin/distributors/${m.distributor.id}`}
                            className="text-xs font-medium text-[var(--primary)] hover:underline"
                          >
                            {m.distributor.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">مباشر</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--foreground)]">{m._count.orders}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--foreground)]">{m._count.products}</td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('ar-SD')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              صفحة {result.pagination.page} من {result.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/merchants?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]">السابق</Link>
              )}
              {page < result.pagination.totalPages && (
                <Link href={`/admin/merchants?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                  className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">التالي</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
