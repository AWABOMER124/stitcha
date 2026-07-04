import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDistributorUsersAction } from '@/modules/users/actions';
import { DistributorUsersClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function DistributorUsersPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const result = await getDistributorUsersAction();
  const users = result.success ? (result.data as unknown[]) : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">المستخدمون</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          إدارة موظفي حساب الموزع وصلاحياتهم
        </p>
      </div>
      <DistributorUsersClient initialUsers={users as any[]} currentUserId={session.user.id} />
    </div>
  );
}
