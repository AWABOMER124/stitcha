/**
 * Category page — shows products filtered by category
 */
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <a href={`/store/${slug}`} className="hover:text-red-700">Menu</a>
        <span>/</span>
        <span className="text-stone-900 dark:text-stone-100 font-medium">{categorySlug}</span>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100 capitalize">
        {categorySlug.replace(/-/g, " ")}
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* TODO: Fetch real products by category */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 text-center">
          <p className="text-sm text-stone-500">Products in this category will appear here</p>
        </div>
      </div>
    </div>
  );
}
