import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getProductsAction } from '@/modules/products/actions';
import { getBranchesAction } from '@/modules/branches/actions';
import { ManualOrderClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function NewManualOrderPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');
  const [productsResult, branchesResult] = await Promise.all([
    getProductsAction({ isActive: true, limit: 100 }),
    getBranchesAction(),
  ]);
  const products = productsResult.success ? (productsResult.data?.data ?? []).map((product) => ({ id: product.id, name: product.name, price: Number(product.price), sku: product.sku })) : [];
  const branches = branchesResult.success ? (branchesResult.data ?? []).filter((branch) => branch.isActive).map((branch) => ({ id: branch.id, name: branch.name, isMain: branch.isMain })) : [];
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">إنشاء طلب</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">سجّل طلباً مباشراً من الهاتف أو واتساب أو داخل المحل.</p></div><Link href="/dashboard/orders" className="rounded-xl border px-4 py-2.5 text-sm font-bold">العودة للطلبات</Link></div><ManualOrderClient products={products} branches={branches}/></div>;
}
