'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDistributorStatusAction } from '@/modules/admin/actions';
import { useLocale } from '@/lib/i18n/context';

export function DistributorDetailClient({
  distributorId,
  currentStatus,
}: {
  distributorId: string;
  currentStatus: string;
}) {
  const { dict } = useLocale();
  const t = dict.adminDistributorDetailPage;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    startTransition(async () => {
      await updateDistributorStatusAction(distributorId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {currentStatus === 'PENDING' && (
        <button
          onClick={() => changeStatus('ACTIVE')}
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? '...' : t.activateDistributor}
        </button>
      )}
      {currentStatus === 'ACTIVE' && (
        <button
          onClick={() => changeStatus('SUSPENDED')}
          disabled={isPending}
          className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? '...' : t.suspendDistributor}
        </button>
      )}
      {currentStatus === 'SUSPENDED' && (
        <button
          onClick={() => changeStatus('ACTIVE')}
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? '...' : t.reactivateDistributor}
        </button>
      )}
    </div>
  );
}
