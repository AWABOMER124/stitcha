"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { getNotificationsAction, getUnreadCountAction, markAsReadAction } from "@/modules/notifications/actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  NEW_ORDER: "🛒",
  ORDER_STATUS: "📦",
  LOW_STOCK: "⚠️",
  SYSTEM: "⚙️",
};

/**
 * Dashboard topbar with search, notifications, and user menu
 */
export function DashboardTopbar() {
  const { dict } = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUnreadCountAction().then((res) => {
      if (res.success) setUnreadCount(res.data);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleNotifications() {
    setUserMenuOpen(false);
    setNotifOpen((open) => {
      const next = !open;
      if (next && !notifLoaded) {
        getNotificationsAction({ limit: 5 }).then((res) => {
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
        const res = await markAsReadAction({ ids: [n.id] });
        if (res.success) {
          setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      });
    }
    setNotifOpen(false);
    router.push("/dashboard/notifications");
  }

  const userName = session?.user?.name ?? session?.user?.email ?? dict.topbar.merchantOwner;
  const userInitial = (session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase();

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
                href="/dashboard/notifications"
                onClick={() => setNotifOpen(false)}
                className="block border-t border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
              >
                {dict.topbar.viewAllNotifications}
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-[var(--border)]" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setNotifOpen(false);
              setUserMenuOpen((o) => !o);
            }}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
              {userInitial}
            </div>
            <div className="hidden text-start md:block">
              <p className="text-sm font-medium text-[var(--foreground)] max-w-[140px] truncate">{userName}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{dict.topbar.merchantOwner}</p>
            </div>
            <svg className="hidden h-4 w-4 text-[var(--muted-foreground)] md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden py-1">
              <div className="px-4 py-2.5 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{userName}</p>
                {session?.user?.email && <p className="text-xs text-[var(--muted-foreground)] truncate">{session.user.email}</p>}
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                {dict.topbar.settings}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="block w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {dict.topbar.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
