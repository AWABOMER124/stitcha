import { cookies } from 'next/headers';
import { getCategoriesAction } from '@/modules/categories/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Add Product — Wassalk OS' };

export default async function NewProductPage() {
  const [result, cookieStore] = await Promise.all([getCategoriesAction(), cookies()]);
  const categories = (result.success ? result.data ?? [] : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].productFormPage;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.addTitle}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t.addSubtitle}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
