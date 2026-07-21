import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getUsersAction } from '@/modules/users/actions';
import { StaffClient, type StaffRow } from './_client';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getUsersAction();
  const staff = result.success ? (result.data as StaffRow[]) : [];

  return <StaffClient initialStaff={staff} currentUserId={session.user.id} />;
}
