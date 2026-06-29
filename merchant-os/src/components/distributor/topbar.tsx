"use client";

import { signOut, useSession } from "next-auth/react";

const APP_VERSION = "1.0.0";

export function DistributorTopbar() {
  const { data: session } = useSession();

  return (
    <header
      dir="rtl"
      className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 gap-3"
    >
      {/* Right: user info */}
      <div className="flex items-center gap-3">
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

      {/* Left: sign out */}
      <div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <span>خروج</span>
          <span>→</span>
        </button>
      </div>
    </header>
  );
}
