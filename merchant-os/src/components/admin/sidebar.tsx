'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

type NavItem =
  | { type: 'link'; label: string; href: string; icon: string }
  | { type: 'section'; label: string }
  | { type: 'divider' };

const navItems: NavItem[] = [
  { type: 'section', label: 'الإدارة العامة' },
  { type: 'link', label: 'لوحة التحكم', href: '/admin', icon: '🏛️' },
  { type: 'divider' },
  { type: 'section', label: 'الكيانات' },
  { type: 'link', label: 'الموزعون', href: '/admin/distributors', icon: '🏢' },
  { type: 'link', label: 'التجار', href: '/admin/merchants', icon: '🏪' },
  { type: 'divider' },
  { type: 'section', label: 'المالية والتقارير' },
  { type: 'link', label: 'المالية', href: '/admin/finance', icon: '💰' },
  { type: 'divider' },
  { type: 'section', label: 'النظام' },
  { type: 'link', label: 'المستخدمون', href: '/admin/users', icon: '👤' },
  { type: 'link', label: 'الإعدادات', href: '/admin/settings', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-l border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-lg font-bold shadow">
          ✦
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--sidebar-foreground)]">Waslak Admin</h2>
          <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">Platform Control</p>
        </div>
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
          Platform Owner
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
