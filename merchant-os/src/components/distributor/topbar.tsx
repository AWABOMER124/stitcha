"use client";

import { signOut, useSession } from "next-auth/react";
import { useLocale } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { useMobileNav } from "@/components/ui/mobile-nav-context";

const APP_VERSION = "1.0.0";

export function DistributorTopbar() {
  const { data: session } = useSession();
  const { dict } = useLocale();
  const { toggle: toggleMobileNav } = useMobileNav();

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 gap-3">
      {/* User info */}
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
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
          {(session?.user?.name ?? "م").charAt(0)}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">
            {session?.user?.name ?? "الموزع"}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)]">بوابة الموزع</p>
        </div>
      </div>

      {/* Center: version badge */}
      <div className="flex items-center">
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          🚀 تحديثات نسخة {APP_VERSION}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <span>{dict.topbar.logout}</span>
          <span>→</span>
        </button>
      </div>
    </header>
  );
}
