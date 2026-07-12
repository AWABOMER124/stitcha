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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Branches</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage your store branches and locations</p>
      </div>
      <BranchesClient initialBranches={branches} />
    </div>
  );
}
