import { getCategoriesAction } from '@/modules/categories/actions';
import { ProductForm } from '../_components/product-form';

export const metadata = { title: 'Add Product — Wassalk OS' };

export default async function NewProductPage() {
  const result = await getCategoriesAction();
  const categories = (result.success ? result.data ?? [] : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Add Product</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          New product will be visible to customers once marked active.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
