import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getAllCustomersAction } from '@/modules/crm/actions';
import { CustomersClient } from './_client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getAllCustomersAction();
  const customers = result.success ? (result.data as any[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/dashboard/crm" className="hover:text-[var(--primary)]">CRM</Link>
          <span>/</span>
          <span>العملاء</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">العملاء</h1>
      </div>
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
