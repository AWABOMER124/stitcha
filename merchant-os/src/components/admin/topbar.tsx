'use client';

import { useSession } from 'next-auth/react';
import { LanguageToggle } from '@/lib/i18n/language-toggle';

export function AdminTopbar() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-3 py-1">
          ✦ Platform Admin
        </span>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--foreground)]">{session?.user?.name ?? 'Admin'}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{session?.user?.email}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">
          {(session?.user?.name ?? 'A').charAt(0)}
        </div>
      </div>
    </header>
  );
}
