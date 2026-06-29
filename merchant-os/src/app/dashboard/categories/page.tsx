/**
 * Categories management page
 */
export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Categories</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Organize your products into categories</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90">
          <span>+</span> Add Category
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { name: "وجبات رئيسية", slug: "main-dishes", products: 12, isActive: true },
          { name: "مشروبات", slug: "drinks", products: 8, isActive: true },
          { name: "حلويات", slug: "desserts", products: 5, isActive: true },
          { name: "مقبلات", slug: "appetizers", products: 0, isActive: false },
        ].map((category) => (
          <div key={category.slug} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">{category.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{category.products} products</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                category.isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
              }`}>
                {category.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]">
                Edit
              </button>
              <button className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
