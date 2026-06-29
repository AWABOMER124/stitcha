"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const APP_VERSION = "1.0.0";

type NavItem =
  | { type: "link"; label: string; href: string; icon: string }
  | { type: "group"; label: string; icon: string; children: { label: string; href: string }[] }
  | { type: "section"; label: string }
  | { type: "divider" };

const navItems: NavItem[] = [
  { type: "section", label: "بياناتي" },
  { type: "link", label: "اللوحة العامة", href: "/distributor/dashboard", icon: "📊" },
  { type: "link", label: "التجار", href: "/distributor/merchants", icon: "🏪" },
  { type: "link", label: "لوحة الإرسال", href: "/distributor/dispatch", icon: "🚀" },
  { type: "divider" },
  { type: "section", label: "الطلبيات والتشغيل" },
  { type: "link", label: "الموافقات", href: "/distributor/approvals", icon: "✅" },
  { type: "link", label: "السائقون", href: "/distributor/drivers", icon: "🏍️" },
  {
    type: "group",
    label: "شركات التوصيل",
    icon: "🚚",
    children: [
      { label: "قائمة الشركات", href: "/distributor/delivery-companies" },
      { label: "تعيين مندوبين", href: "/distributor/delivery-companies/drivers" },
    ],
  },
  { type: "divider" },
  { type: "section", label: "المالية" },
  {
    type: "group",
    label: "المالية",
    icon: "💰",
    children: [
      { label: "لوحة المالية", href: "/distributor/finance" },
      { label: "خطط العمولات", href: "/distributor/finance/commissions" },
      { label: "التسويات", href: "/distributor/finance/settlements" },
      { label: "قوائم الأسعار", href: "/distributor/finance/price-lists" },
    ],
  },
  { type: "divider" },
  { type: "section", label: "الإعدادات" },
  { type: "link", label: "الإعدادات العامة", href: "/distributor/settings", icon: "⚙️" },
  { type: "link", label: "تصدير البيانات", href: "/distributor/export", icon: "📤" },
];

function GroupItem({ item }: { item: Extract<NavItem, { type: "group" }> }) {
  const pathname = usePathname();
  const isAnyChildActive = item.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
          isAnyChildActive
            ? "bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] font-semibold"
            : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </div>
        <span
          className={`text-xs opacity-50 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ‹
        </span>
      </button>

      {open && (
        <ul className="mt-1 mr-4 border-r-2 border-[var(--sidebar-border)] pr-3 space-y-0.5">
          {item.children.map((child) => {
            const isActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--sidebar-primary)] text-white font-medium"
                      : "text-[var(--sidebar-foreground)]/80 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function DistributorSidebar() {
  const pathname = usePathname();

  return (
    <aside
      dir="rtl"
      className="hidden w-64 flex-shrink-0 flex-col border-l border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-[var(--sidebar-border)] px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sidebar-primary)] text-white text-sm font-black shadow-sm">
          و
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black text-[var(--sidebar-foreground)] tracking-wide">وصلك</h2>
          <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">بوابة الموزع</p>
        </div>
        <span className="flex-shrink-0 text-[10px] bg-[var(--sidebar-primary)]/10 text-[var(--sidebar-primary)] border border-[var(--sidebar-primary)]/20 px-1.5 py-0.5 rounded font-mono font-bold">
          v{APP_VERSION}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {navItems.map((item, idx) => {
            if (item.type === "divider") {
              return <li key={`div-${idx}`} className="my-2 border-t border-[var(--sidebar-border)]" />;
            }

            if (item.type === "section") {
              return (
                <li key={`sec-${idx}`} className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                    {item.label}
                  </span>
                </li>
              );
            }

            if (item.type === "group") {
              return <GroupItem key={`grp-${idx}`} item={item} />;
            }

            const isActive =
              pathname === item.href ||
              (item.href !== "/distributor/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-semibold shadow-sm"
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

      {/* Logout */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <span>→</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
