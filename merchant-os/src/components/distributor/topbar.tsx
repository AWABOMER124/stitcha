"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { useMobileNav } from "@/components/ui/mobile-nav-context";
import {
  getDistributorNotificationsAction,
  getDistributorUnreadCountAction,
  markDistributorNotificationsReadAction,
} from "@/modules/distributor-notifications/actions";

const APP_VERSION = "1.0.0";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  NEW_MERCHANT: "🏪",
  SYSTEM: "⚙️",
};

export function DistributorTopbar() {
  const { data: session } = useSession();
  const { dict } = useLocale();
  const router = useRouter();
  const { toggle: toggleMobileNav } = useMobileNav();
  const [, startTransition] = useTransition();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDistributorUnreadCountAction().then((res) => {
      if (res.success) setUnreadCount(res.data);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleNotifications() {
    setNotifOpen((open) => {
      const next = !open;
      if (next && !notifLoaded) {
        getDistributorNotificationsAction({ limit: 5 }).then((res) => {
          if (res.success) setNotifications(res.data.data as unknown as NotificationItem[]);
          setNotifLoaded(true);
        });
      }
      return next;
    });
  }

  function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead) {
      startTransition(async () => {
        const res = await markDistributorNotificationsReadAction({ ids: [n.id] });
        if (res.success) {
          setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      });
    }
    setNotifOpen(false);
    router.push("/distributor/approvals");
  }

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

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotifications}
            className="relative rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label={dict.topbar.notifications}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute end-0 z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
                {!notifLoaded ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">…</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">{dict.notificationsPage.emptyAll}</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-3 text-start hover:bg-[var(--muted)] transition-colors ${!n.isRead ? "bg-[var(--primary)]/[0.04]" : ""}`}
                    >
                      <span className="text-base leading-none mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">{n.title}</span>
                          {!n.isRead && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{n.body}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <Link
                href="/distributor/approvals"
                onClick={() => setNotifOpen(false)}
                className="block border-t border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
              >
                {dict.topbar.viewAllNotifications}
              </Link>
            </div>
          )}
        </div>

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
