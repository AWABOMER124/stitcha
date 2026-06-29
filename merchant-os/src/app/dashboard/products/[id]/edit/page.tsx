import { notFound } from 'next/navigation';
import { getProductAction } from '@/modules/products/actions';
import { getCategoriesAction } from '@/modules/categories/actions';
import { ProductForm } from '../../_components/product-form';

export const metadata = { title: 'Edit Product — Wassalk OS' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const [productResult, categoriesResult] = await Promise.all([
    getProductAction(id),
    getCategoriesAction(),
  ]);

  if (!productResult.success || !productResult.data) notFound();

  const product = productResult.data;
  const categories = (categoriesResult.success ? categoriesResult.data ?? [] : []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Edit Product</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{product.name}</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <ProductForm
          categories={categories}
          product={{
            id: product.id,
            name: product.name,
            description: product.description ?? undefined,
            categoryId: product.categoryId,
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
            sku: product.sku ?? undefined,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
          }}
        />
      </div>
    </div>
  );
}
