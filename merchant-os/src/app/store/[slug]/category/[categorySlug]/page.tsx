import { notFound } from 'next/navigation';
import * as service from '@/modules/storefront/services/storefront.service';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;

  const [storeData, products] = await Promise.all([
    service.getStoreData(slug).catch(() => null),
    service.getStoreProducts(slug, categorySlug).catch(() => []),
  ]);

  if (!storeData) notFound();

  const { merchant } = storeData;
  const theme = (merchant.storefrontSettings?.theme ?? {}) as Record<string, string>;
  const primary = theme.primaryColor ?? '#b91c1c';
  const categoryName = categorySlug.replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`:root{--sp:${primary}}`}</style>

      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 h-14">
          <a
            href={`/store/${slug}`}
            className="text-stone-500 hover:text-stone-800 text-sm flex items-center gap-1"
          >
            ← <span>{merchant.name}</span>
          </a>
          <span className="text-stone-300">/</span>
          <span className="font-semibold text-stone-900 capitalize">{categoryName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-bold text-stone-900 capitalize mb-5 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ background: primary }} />
          {categoryName}
        </h1>

        {(products as unknown[]).length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-3">🔍</div>
            <p>لا توجد منتجات في هذا القسم</p>
            <a
              href={`/store/${slug}`}
              className="mt-5 inline-flex text-sm font-medium px-5 py-2.5 rounded-xl text-white"
              style={{ background: primary }}
            >
              العودة للقائمة
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(products as any[]).map((p) => (
              <a
                key={p.id}
                href={`/store/${slug}`}
                className="bg-white rounded-2xl border border-stone-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all group"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-4xl opacity-40">🍽️</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-stone-900 text-sm leading-tight">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{p.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: primary }}>
                      {Number(p.price).toLocaleString()} SDG
                    </span>
                    {p.compareAtPrice && (
                      <span className="text-xs text-stone-400 line-through">
                        {Number(p.compareAtPrice).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
