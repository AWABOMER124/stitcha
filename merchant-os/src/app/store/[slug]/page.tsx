/**
 * Public storefront home page — displays merchant info, categories, and featured products.
 * This is what customers see when they visit /store/{merchantSlug}
 */
export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // TODO: Fetch real data from storefront service
  const merchant = {
    name: "مطعم الشيف",
    slug,
    description: "أشهى المأكولات والمشروبات الطازجة",
    isOpen: true,
  };

  const categories = [
    { id: "1", name: "وجبات رئيسية", slug: "main-dishes", productCount: 12 },
    { id: "2", name: "مشروبات", slug: "drinks", productCount: 8 },
    { id: "3", name: "حلويات", slug: "desserts", productCount: 5 },
  ];

  const products = [
    { id: "1", name: "شاورما دجاج", price: 250, image: null, category: "وجبات رئيسية", description: "شاورما دجاج طازجة مع صلصة الثوم" },
    { id: "2", name: "برجر لحم", price: 300, image: null, category: "وجبات رئيسية", description: "برجر لحم بقري مع جبنة شيدر" },
    { id: "3", name: "عصير مانجو", price: 80, image: null, category: "مشروبات", description: "عصير مانجو طبيعي طازج" },
    { id: "4", name: "كيك شوكولاتة", price: 150, image: null, category: "حلويات", description: "كيك شوكولاتة بلجيكية فاخرة" },
    { id: "5", name: "فلافل عراقي", price: 180, image: null, category: "وجبات رئيسية", description: "فلافل عراقي مع طحينة" },
    { id: "6", name: "شاي أحمر", price: 30, image: null, category: "مشروبات", description: "شاي أحمر سوداني تقليدي" },
  ];

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-red-700 to-red-900 px-4 py-16 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className={`h-2 w-2 rounded-full ${merchant.isOpen ? "bg-emerald-400" : "bg-red-400"}`} />
            {merchant.isOpen ? "Open Now" : "Closed"}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {merchant.name}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/80">
            {merchant.description}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto px-4 py-4">
          <button className="whitespace-nowrap rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm">
            All
          </button>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/store/${slug}/category/${cat.slug}`}
              className="whitespace-nowrap rounded-full border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 transition-colors hover:border-red-300 hover:text-red-700 dark:hover:text-red-400"
            >
              {cat.name} ({cat.productCount})
            </a>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-xl font-bold text-stone-900 dark:text-stone-100">
          Menu
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden transition-all hover:shadow-lg hover:border-red-200 dark:hover:border-red-900"
            >
              {/* Product Image Placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-700 flex items-center justify-center">
                <span className="text-5xl opacity-50">🍽️</span>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-red-700 dark:text-red-400">
                    {product.price} SDG
                  </span>
                  <button className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-800 active:scale-95">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
