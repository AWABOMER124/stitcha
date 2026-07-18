'use client';

import { useState, useTransition } from 'react';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from '@/modules/categories/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count?: { products: number };
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const { dict } = useLocale();
  const t = dict.categoriesPage;
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      if (editingId) {
        const res = await updateCategoryAction(editingId, { name });
        if (res.success) {
          setCategories((c) => c.map((cat) => (cat.id === editingId ? { ...cat, ...(res.data as Category) } : cat)));
          resetForm();
        } else setError(res.error);
      } else {
        const res = await createCategoryAction({ name });
        if (res.success) {
          setCategories((c) => [...c, { ...(res.data as Category), _count: { products: 0 } }]);
          resetForm();
        } else setError(res.error);
      }
    });
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setShowForm(true);
  }

  function handleToggleActive(category: Category) {
    startTransition(async () => {
      const res = await updateCategoryAction(category.id, { isActive: !category.isActive });
      if (res.success) {
        setCategories((c) => c.map((cat) => (cat.id === category.id ? { ...cat, isActive: !category.isActive } : cat)));
      }
    });
  }

  async function handleDelete(category: Category) {
    const ok = await confirmDialog({ message: t.confirmDelete.replace('{name}', category.name), confirmLabel: dict.crud.delete, danger: true });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(category.id);
      if (res.success) setCategories((c) => c.filter((cat) => cat.id !== category.id));
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <div className="space-y-5">
      <button
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90"
      >
        {showForm ? dict.crud.cancel : t.addCategory}
      </button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">
            {editingId ? t.editCategory : t.newCategory}
          </h3>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.categoryName}</label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.categoryNamePlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? dict.crud.saving : editingId ? dict.crud.save : t.create}
            </button>
          </form>
        </div>
      )}

      {categories.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{category.name}</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {t.productsCount.replace('{count}', String(category._count?.products ?? 0))}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleActive(category)}
                  disabled={isPending}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    category.isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                  }`}
                >
                  {category.isActive ? dict.crud.active : dict.crud.inactive}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => startEdit(category)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                >
                  {dict.crud.edit}
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  disabled={isPending}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  {dict.crud.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
