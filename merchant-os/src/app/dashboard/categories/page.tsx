import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getCategoriesAction } from '@/modules/categories/actions';
import { CategoriesClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getCategoriesAction(true);
  const categories = result.success ? (result.data as any[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">التصنيفات</h1>
        <p className="text-sm text-[var(--muted-foreground)]">نظّم منتجاتك في تصنيفات</p>
      </div>
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
