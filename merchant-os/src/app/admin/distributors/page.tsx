import { getAllDistributorsAction } from '@/modules/admin/actions';
import Link from 'next/link';
import { DistributorsClient } from './_client';

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

type PageData = {
  data: DistributorRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export default async function AdminDistributorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? '';

  const res = await getAllDistributorsAction(page, 20, search || undefined);
  const result = res.success
    ? (res.data as PageData)
    : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">الموزعون</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {result.pagination.total} موزع مسجّل في المنصة
          </p>
        </div>
      </div>

      <DistributorsClient
        initialData={result.data}
        pagination={result.pagination}
        initialSearch={search}
        initialPage={page}
      />
    </div>
  );
}
