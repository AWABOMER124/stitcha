import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getBranchesAction } from '@/modules/branches/actions';
import { BranchesClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const result = await getBranchesAction();
  const branches = result.success ? (result.data as any[]) : [];

  return <BranchesClient initialBranches={branches} />;
}
