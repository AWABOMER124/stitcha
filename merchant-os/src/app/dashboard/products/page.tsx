import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getProductsAction, toggleProductStatusAction, deleteProductAction } from '@/modules/products/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, type Dictionary } from '@/lib/i18n/translations';
import { ProductFilters } from './_components/product-filters';

async function getDict(): Promise<Dictionary> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  return dictionaries[locale];
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

async function ProductsTable({ q, status }: { q?: string; status?: string }) {
  const [result, dict] = await Promise.all([
    getProductsAction({
      search: q,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    }),
    getDict(),
  ]);
  const t = dict.productsPage;

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          {result.error ?? t.loadFailed}
        </p>
      </div>
    );
  }

  const products = result.data?.data ?? [];
  const totalCount = result.data?.pagination.total ?? products.length;

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">{t.empty}</p>
        <a href="/dashboard/products/new" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
          {t.addFirst}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colProduct}</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colPrice}</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colStatus}</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{t.colActions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {products.map((product) => {
            async function toggle() {
              'use server';
              await toggleProductStatusAction(product.id);
            }

            async function remove() {
              'use server';
              await deleteProductAction(product.id);
            }

            const images = Array.isArray(product.images) ? product.images as string[] : [];
            const firstImage = images[0] ?? null;

            return (
              <tr key={product.id} className="transition-colors hover:bg-[var(--muted)]/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[var(--muted)] overflow-hidden flex-shrink-0">
                      {firstImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstImage} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-[var(--muted-foreground)]">{t.sku}: {product.sku}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                  {Number(product.price).toLocaleString()} SDG
                  {product.compareAtPrice && (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)] line-through">
                      {Number(product.compareAtPrice).toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    product.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-950 dark:text-stone-400'
                  }`}>
                    {product.isActive ? t.active : t.inactive}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <a href={`/dashboard/products/${product.id}/edit`} className="text-sm text-[var(--primary)] hover:underline">
                      {t.edit}
                    </a>
                    <form action={toggle}>
                      <button type="submit" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        {product.isActive ? t.deactivate : t.activate}
                      </button>
                    </form>
                    <form action={remove}>
                      <button type="submit" className="text-sm text-red-500 hover:text-red-700">
                        {t.delete}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-[var(--border)] px-6 py-3 text-xs text-[var(--muted-foreground)]">
        {products.length} {t.countSuffix} · {totalCount} {t.totalSuffix}
      </div>
    </div>
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const dict = await getDict();
  const t = dict.productsPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
        </div>
        <a
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90"
        >
          <span>{t.addProduct}</span>
        </a>
      </div>

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-[var(--muted)]" />}>
        <ProductFilters />
      </Suspense>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[var(--muted)]" />}>
        <ProductsTable q={q} status={status} />
      </Suspense>
    </div>
  );
}
