import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getCustomersAction } from '@/modules/customers/actions';
import { CustomersClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getCustomersAction({ page: 1, limit: 50 });
  const customers = result.success ? ((result.data as any)?.data ?? []) : [];

  return <CustomersClient initialCustomers={customers} />;
}
