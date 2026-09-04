'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLocale } from '@/lib/i18n/context';
import type { Dictionary } from '@/lib/i18n/translations';
import { useMobileNav } from '@/components/ui/mobile-nav-context';
import { WaslaMark } from '@/components/brand/wasla-logo';
import type { UserRole } from '@prisma/client';

type NavItem =
  | { type: 'link'; label: string; href: string; icon: string }
  | { type: 'section'; label: string }
  | { type: 'divider' };

function buildNavItems(nav: Dictionary['navAdmin'], role: UserRole): NavItem[] {
  const isOwner = role === 'PLATFORM_OWNER';
  const isAdmin = role === 'PLATFORM_ADMIN';
  const isOperations = role === 'PLATFORM_OPERATIONS';
  const isFinance = role === 'PLATFORM_FINANCE';
  return [
    { type: 'section', label: nav.generalSection },
    { type: 'link', label: nav.dashboard, href: '/admin', icon: '🏛️' },
    { type: 'divider' },
    { type: 'section', label: nav.entitiesSection },
    { type: 'link', label: nav.merchants, href: '/admin/merchants', icon: '🏪' },
    ...(isOwner || isAdmin || isOperations ? [{ type: 'link' as const, label: nav.complaints, href: '/admin/complaints', icon: '🛟' }] : []),
    ...(isOwner || isAdmin || isOperations ? [{ type: 'link' as const, label: nav.verifications, href: '/admin/verifications', icon: '🪪' }] : []),
    ...(isOwner || isAdmin || isOperations ? [{ type: 'link' as const, label: nav.domains, href: '/admin/domains', icon: '🔗' }] : []),
    ...(isOwner || isAdmin || isOperations ? [{ type: 'link' as const, label: nav.marketers, href: '/admin/marketers', icon: '📣' }] : []),
    { type: 'divider' },
    ...(isOwner || isAdmin || isOperations ? [{ type: 'link' as const, label: nav.deliveryPartners, href: '/admin/delivery-partners', icon: '🚚' }] : []),
    { type: 'section', label: nav.financeReportsSection },
    ...(isOwner || isAdmin || isFinance ? [
      { type: 'link' as const, label: nav.finance, href: '/admin/finance', icon: '💰' },
      { type: 'link' as const, label: nav.customerSubscriptions, href: '/admin/customer-subscriptions', icon: '⭐' },
      { type: 'link' as const, label: nav.subscriptionPayments, href: '/admin/subscription-payments', icon: '🧾' },
      { type: 'link' as const, label: nav.referrals, href: '/admin/referrals', icon: '🤝' },
    ] : []),
    { type: 'divider' },
    { type: 'section', label: nav.systemSection },
    ...(isOwner ? [{ type: 'link' as const, label: nav.users, href: '/admin/users', icon: '👤' }] : []),
    ...(isOwner || isAdmin ? [{ type: 'link' as const, label: nav.settings, href: '/admin/settings', icon: '⚙️' }] : []),
  ];
}

export function AdminSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { open, close } = useMobileNav();
  const navItems = buildNavItems(dict.navAdmin, role);

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
          <WaslaMark />
          <div>
            <h2 className="text-sm font-bold text-[var(--sidebar-foreground)]">WASLA | وصلة</h2>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">Commerce OS</p>
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
            {role === 'PLATFORM_OWNER' ? dict.topbar.platformOwner : role.replace('PLATFORM_', '').replace('_', ' ')}
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
