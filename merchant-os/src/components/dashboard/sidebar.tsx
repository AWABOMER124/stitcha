"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import type { Dictionary } from "@/lib/i18n/translations";
import { useMobileNav } from "@/components/ui/mobile-nav-context";

/**
 * Dashboard sidebar navigation component
 */

type NavItem =
  | { type: "link"; label: string; href: string; icon: string }
  | { type: "section"; label: string };

function buildNavItems(nav: Dictionary["navDashboard"]): NavItem[] {
  return [
    { type: "link", label: nav.home, href: "/dashboard", icon: "📊" },
    { type: "link", label: nav.fulfillment, href: "/dashboard/fulfillment", icon: "⚡" },
    { type: "link", label: nav.orders, href: "/dashboard/orders", icon: "📦" },
    { type: "link", label: nav.products, href: "/dashboard/products", icon: "🛍️" },
    { type: "link", label: nav.categories, href: "/dashboard/categories", icon: "📂" },
    { type: "link", label: nav.inventory, href: "/dashboard/inventory", icon: "📋" },
    { type: "section", label: nav.storefrontSection },
    { type: "link", label: nav.storefrontSettings, href: "/dashboard/storefront", icon: "🌐" },
    { type: "link", label: nav.customize, href: "/dashboard/storefront/customize", icon: "🎨" },
    { type: "link", label: nav.aiGenerator, href: "/dashboard/storefront/ai", icon: "🤖" },
    { type: "link", label: nav.inbox, href: "/dashboard/inbox", icon: "💬" },
    { type: "section", label: nav.financeSection },
    { type: "link", label: nav.financeDashboard, href: "/dashboard/finance", icon: "💰" },
    { type: "link", label: nav.transactions, href: "/dashboard/finance/transactions", icon: "💳" },
    { type: "link", label: nav.settlements, href: "/dashboard/finance/settlements", icon: "🧾" },
    { type: "section", label: nav.crmSection },
    { type: "link", label: nav.crm, href: "/dashboard/crm", icon: "🎯" },
    { type: "link", label: nav.promos, href: "/dashboard/crm/promos", icon: "🎟️" },
    { type: "link", label: nav.loyalty, href: "/dashboard/crm/loyalty", icon: "⭐" },
    { type: "section", label: nav.operationsSection },
    { type: "link", label: nav.branches, href: "/dashboard/branches", icon: "🏪" },
    { type: "link", label: nav.staff, href: "/dashboard/staff", icon: "👤" },
    { type: "link", label: nav.delivery, href: "/dashboard/delivery", icon: "🚚" },
    { type: "link", label: nav.reports, href: "/dashboard/reports", icon: "📈" },
    { type: "link", label: nav.notifications, href: "/dashboard/notifications", icon: "🔔" },
    { type: "link", label: nav.settings, href: "/dashboard/settings", icon: "⚙️" },
  ];
}

export function DashboardSidebar({
  merchantName,
  merchantSlug,
}: {
  merchantName: string;
  merchantSlug: string;
}) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { open, close } = useMobileNav();
  const navItems = buildNavItems(dict.navDashboard);

  useEffect(() => {
    close();
    // Close the mobile drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 start-0 z-40 w-64 flex-col border-e border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] text-lg font-bold">
            و
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--sidebar-foreground)]">
              Waslak
            </h2>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
              Merchant OS
            </p>
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

        {/* Merchant Info */}
        <div className="border-b border-[var(--sidebar-border)] px-4 py-3">
          <div className="flex items-center gap-3 rounded-lg bg-[var(--sidebar-accent)] px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)]/10 text-sm">
              🍽️
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[var(--sidebar-foreground)]">
                {merchantName}
              </p>
              <p className="truncate text-[10px] text-[var(--muted-foreground)]">
                {merchantSlug}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              if (item.type === "section") {
                return (
                  <li key={item.label} className="pt-3 pb-1 px-2">
                    <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest">{item.label}</span>
                  </li>
                );
              }
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-medium shadow-sm"
                        : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
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

        {/* Store Link */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <Link
            href={`/store/${merchantSlug}`}
            target="_blank"
            className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--sidebar-border)] px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary)]"
          >
            <span>🌐</span>
            <span>{dict.topbar.viewStorefront}</span>
            <span className="ms-auto text-xs">↗</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
