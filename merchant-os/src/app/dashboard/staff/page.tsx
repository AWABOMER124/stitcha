import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getUsersAction } from '@/modules/users/actions';
import { StaffClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getUsersAction();
  const staff = result.success ? (result.data as any[]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Staff</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage team members and permissions</p>
      </div>
      <StaffClient initialStaff={staff} currentUserId={session.user.id} />
    </div>
  );
}
