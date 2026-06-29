'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_TABS = ['ALL', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export function StatusTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('status') ?? 'ALL';

  function handleTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', tab);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[var(--muted)] p-1">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => handleTab(tab)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            current === tab
              ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {tab.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}
