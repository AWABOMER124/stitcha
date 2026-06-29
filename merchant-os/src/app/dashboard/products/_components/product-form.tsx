'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction, updateProductAction } from '@/modules/products/actions';

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  id?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  compareAtPrice?: number;
  sku?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

interface ProductFormProps {
  categories: Category[];
  product?: ProductFormData;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!product?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      categoryId: fd.get('categoryId') as string,
      price: Number(fd.get('price')),
      compareAtPrice: fd.get('compareAtPrice') ? Number(fd.get('compareAtPrice')) : undefined,
      sku: (fd.get('sku') as string) || undefined,
      isActive: fd.get('isActive') === 'on',
      isFeatured: fd.get('isFeatured') === 'on',
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction(product!.id!, payload)
        : await createProductAction(payload);

      if (!result.success) {
        setError(result.error ?? 'Something went wrong');
        return;
      }
      router.push('/dashboard/products');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-[var(--foreground)]">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          defaultValue={product?.name}
          placeholder="e.g. Chicken Shawarma"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-[var(--foreground)]">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description}
          placeholder="Optional description..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-[var(--foreground)]">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? ''}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          <option value="" disabled>Select a category…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium text-[var(--foreground)]">
            Price (SDG) <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={product?.price}
            placeholder="0.00"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="compareAtPrice" className="text-sm font-medium text-[var(--foreground)]">
            Compare-at Price
          </label>
          <input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.compareAtPrice}
            placeholder="Optional"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* SKU */}
      <div className="space-y-1.5">
        <label htmlFor="sku" className="text-sm font-medium text-[var(--foreground)]">
          SKU
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          defaultValue={product?.sku}
          placeholder="Optional stock-keeping unit"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={product?.isActive ?? true}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          Active (visible to customers)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={product?.isFeatured ?? false}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          Featured
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
        <a
          href="/dashboard/products"
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving…
            </>
          ) : (
            isEdit ? 'Save Changes' : 'Create Product'
          )}
        </button>
      </div>
    </form>
  );
}
