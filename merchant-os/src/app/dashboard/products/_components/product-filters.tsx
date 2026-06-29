'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        placeholder="Search products..."
        onChange={(e) => update('q', e.target.value)}
        className="w-64 rounded-lg border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
      />
      <select
        defaultValue={searchParams.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm outline-none"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
