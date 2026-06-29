import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getSettlementsAction } from '@/modules/finance/actions';
import Link from 'next/link';
import { SettlementsClient } from './_client';
import prisma from '@/lib/db/prisma';

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const distributorId = session.user.distributorId;

  const [settlementsRes, merchants] = await Promise.all([
    getSettlementsAction({ page: 1, limit: 100 }),
    prisma.merchant.findMany({
      where: { distributorId },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const settlements = settlementsRes.success
    ? (settlementsRes.data as { data: unknown[] }).data
    : [];

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/finance" className="hover:text-[var(--primary)]">المالية</Link>
          <span>/</span>
          <span>التسويات</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">التسويات</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">إدارة التسويات المالية مع التجار</p>
      </div>

      <SettlementsClient initialSettlements={settlements as any[]} merchants={merchants} />
    </div>
  );
}
