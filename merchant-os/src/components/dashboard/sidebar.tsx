"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Dashboard sidebar navigation component
 */

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "لوحة التشغيل", href: "/dashboard/fulfillment", icon: "⚡" },
  { label: "Orders", href: "/dashboard/orders", icon: "📦" },
  { label: "Products", href: "/dashboard/products", icon: "🛍️" },
  { label: "Categories", href: "/dashboard/categories", icon: "📂" },
  { label: "Inventory", href: "/dashboard/inventory", icon: "📋" },
  { label: "Customers", href: "/dashboard/customers", icon: "👥" },
  { label: "إدارة العملاء (CRM)", href: "/dashboard/crm", icon: "🎯" },
  { label: "أكواد الخصم", href: "/dashboard/crm/promos", icon: "🎟️" },
  { label: "نقاط الولاء", href: "/dashboard/crm/loyalty", icon: "⭐" },
  { label: "Branches", href: "/dashboard/branches", icon: "🏪" },
  { label: "Staff", href: "/dashboard/staff", icon: "👤" },
  { label: "Delivery", href: "/dashboard/delivery", icon: "🚚" },
  { label: "Reports", href: "/dashboard/reports", icon: "📈" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex">
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
      </div>

      {/* Merchant Info */}
      <div className="border-b border-[var(--sidebar-border)] px-4 py-3">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--sidebar-accent)] px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)]/10 text-sm">
            🍽️
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--sidebar-foreground)]">
              مطعم الشيف
            </p>
            <p className="truncate text-[10px] text-[var(--muted-foreground)]">
              chef-restaurant
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
          href="/store/chef-restaurant"
          target="_blank"
          className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--sidebar-border)] px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary)]"
        >
          <span>🌐</span>
          <span>View Storefront</span>
          <span className="ml-auto text-xs">↗</span>
        </Link>
      </div>
    </aside>
  );
}
