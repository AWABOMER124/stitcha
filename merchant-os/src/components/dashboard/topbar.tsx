"use client";

import { useLocale } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";

/**
 * Dashboard topbar with search, notifications, and user menu
 */
export function DashboardTopbar() {
  const { dict } = useLocale();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6">
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search */}
        <div className="hidden sm:block">
          <div className="relative">
            <svg
              className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder={dict.topbar.searchPlaceholder}
              className="w-80 rounded-lg border border-[var(--input)] bg-transparent py-2 ps-10 pe-4 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <LanguageToggle />

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label={dict.topbar.notifications}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification badge */}
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-[var(--border)]" />

        {/* User Menu */}
        <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
            A
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-[var(--foreground)]">Admin</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{dict.topbar.merchantOwner}</p>
          </div>
          <svg className="hidden h-4 w-4 text-[var(--muted-foreground)] md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </header>
  );
}
