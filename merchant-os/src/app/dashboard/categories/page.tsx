import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getCategoriesAction } from '@/modules/categories/actions';
import { CategoriesClient, type Category } from './_client';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getCategoriesAction(true);
  const categories = result.success ? (result.data as Category[]) : [];

  return <CategoriesClient initialCategories={categories} />;
}
