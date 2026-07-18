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

  return <InventoryClient initialItems={items} />;
}
