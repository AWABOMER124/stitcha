import { cookies } from 'next/headers';
import { getAllDistributorsAction } from '@/modules/admin/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
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
  const [sp, cookieStore] = await Promise.all([searchParams, cookies()]);
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? '';
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].adminDistributorsPage;

  const res = await getAllDistributorsAction(page, 20, search || undefined);
  const result = res.success
    ? (res.data as PageData)
    : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {result.pagination.total} {t.subtitleSuffix}
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
