'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLocale } from '@/lib/i18n/context';
import type { Dictionary } from '@/lib/i18n/translations';
import { useMobileNav } from '@/components/ui/mobile-nav-context';

type NavItem =
  | { type: 'link'; label: string; href: string; icon: string }
  | { type: 'section'; label: string }
  | { type: 'divider' };

function buildNavItems(nav: Dictionary['navAdmin']): NavItem[] {
  return [
    { type: 'section', label: nav.generalSection },
    { type: 'link', label: nav.dashboard, href: '/admin', icon: '🏛️' },
    { type: 'divider' },
    { type: 'section', label: nav.entitiesSection },
    { type: 'link', label: nav.distributors, href: '/admin/distributors', icon: '🏢' },
    { type: 'link', label: nav.merchants, href: '/admin/merchants', icon: '🏪' },
    { type: 'divider' },
    { type: 'section', label: nav.financeReportsSection },
    { type: 'link', label: nav.finance, href: '/admin/finance', icon: '💰' },
    { type: 'divider' },
    { type: 'section', label: nav.systemSection },
    { type: 'link', label: nav.users, href: '/admin/users', icon: '👤' },
    { type: 'link', label: nav.settings, href: '/admin/settings', icon: '⚙️' },
  ];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { open, close } = useMobileNav();
  const navItems = buildNavItems(dict.navAdmin);

  useEffect(() => {
    close();
    // Close the mobile drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={close} aria-hidden="true" />
      )}

      <aside className={`${open ? 'flex' : 'hidden'} fixed inset-y-0 start-0 z-40 w-64 flex-col border-e border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:static lg:flex`}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-lg font-bold shadow">
            ✦
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--sidebar-foreground)]">Waslak Admin</h2>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">Platform Control</p>
          </div>
          <button
            onClick={close}
            aria-label="Close menu"
            className="ms-auto rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item, i) => {
              if (item.type === 'divider') {
                return <li key={i} className="my-2 border-t border-[var(--sidebar-border)]" />;
              }
              if (item.type === 'section') {
                return (
                  <li key={item.label} className="pt-3 pb-1 px-2">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
                      {item.label}
                    </span>
                  </li>
                );
              }
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? 'bg-[var(--primary)] text-white font-medium shadow-sm'
                        : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--sidebar-border)] p-3 space-y-2">
          <div className="rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20 px-3 py-2 text-xs text-[var(--primary)] font-medium text-center">
            {dict.topbar.platformOwner}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
          >
            <span>🚪</span>
            <span>{dict.topbar.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
