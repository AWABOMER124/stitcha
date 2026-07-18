'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/context';

export function DistributorHomeClient({
  distributorName,
  merchantCount,
  activeMerchantCount,
}: {
  distributorName: string;
  merchantCount: number;
  activeMerchantCount: number;
}) {
  const { dict } = useLocale();
  const t = dict.distributorHome;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{distributorName}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t.totalMerchants} value={merchantCount} icon="🏪" />
        <StatCard label={t.activeMerchants} value={activeMerchantCount} icon="✅" />
        <StatCard label={t.inactive} value={merchantCount - activeMerchantCount} icon="⏸️" />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">{t.quickActions}</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/distributor/merchants/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary)]/90"
          >
            {t.addMerchant}
          </Link>
          <Link
            href="/distributor/merchants"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            {t.viewAllMerchants}
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
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
