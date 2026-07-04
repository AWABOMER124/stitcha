import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getInventoryAction } from '@/modules/inventory/actions';
import { InventoryClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getInventoryAction({ page: 1, limit: 50 });
  const items = result.success ? ((result.data as any)?.data ?? []) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">المخزون</h1>
        <p className="text-sm text-[var(--muted-foreground)]">تابع كميات المنتجات وتنبيهات نفاد المخزون</p>
      </div>
      <InventoryClient initialItems={items} />
    </div>
  );
}
