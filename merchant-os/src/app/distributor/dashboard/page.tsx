import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';
import Link from 'next/link';

export default async function DistributorDashboardPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const distributorId = session.user.distributorId;

  const [distributor, merchantCount, activeMerchantCount] = await Promise.all([
    prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { name: true, slug: true, status: true },
    }),
    prisma.merchant.count({ where: { distributorId } }),
    prisma.merchant.count({ where: { distributorId, status: 'ACTIVE' } }),
  ]);

  if (!distributor) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {distributor.name}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Distributor Dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Merchants" value={merchantCount} icon="🏪" />
        <StatCard label="Active Merchants" value={activeMerchantCount} icon="✅" />
        <StatCard
          label="Inactive"
          value={merchantCount - activeMerchantCount}
          icon="⏸️"
        />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/distributor/merchants/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
          >
            + Add Merchant
          </Link>
          <Link
            href="/distributor/merchants"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            View All Merchants
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold text-[var(--foreground)]">{value}</span>
      </div>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
