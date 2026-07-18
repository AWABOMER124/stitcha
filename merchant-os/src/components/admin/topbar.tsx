'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useLocale } from '@/lib/i18n/context';
import { LanguageToggle } from '@/lib/i18n/language-toggle';
import { useMobileNav } from '@/components/ui/mobile-nav-context';

export function AdminTopbar() {
  const { data: session } = useSession();
  const { dict } = useLocale();
  const { toggle: toggleMobileNav } = useMobileNav();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileNav}
          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-3 py-1">
          ✦ Platform Admin
        </span>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[var(--foreground)]">{session?.user?.name ?? 'Admin'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{session?.user?.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white text-sm font-bold">
              {(session?.user?.name ?? session?.user?.email ?? 'A').charAt(0).toUpperCase()}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden py-1">
              <div className="px-4 py-2.5 border-b border-[var(--border)] sm:hidden">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{session?.user?.name ?? 'Admin'}</p>
                {session?.user?.email && <p className="text-xs text-[var(--muted-foreground)] truncate">{session.user.email}</p>}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="block w-full px-4 py-2 text-right text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {dict.topbar.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
