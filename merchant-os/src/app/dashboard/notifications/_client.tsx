'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { markAsReadAction } from '@/modules/notifications/actions';
import { useLocale } from '@/lib/i18n/context';

export interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string | Date;
}

const TYPE_ICON: Record<string, string> = {
  NEW_ORDER: '🛒',
  ORDER_STATUS: '📦',
  LOW_STOCK: '⚠️',
  SYSTEM: '⚙️',
};

export function NotificationsClient({
  initialNotifications,
  initialPagination,
  activeTab,
}: {
  initialNotifications: Notification[];
  initialPagination: { page: number; limit: number; total: number; totalPages: number };
  activeTab: 'all' | 'unread';
}) {
  const { dict, locale } = useLocale();
  const t = dict.notificationsPage;
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markRead(ids: string[]) {
    startTransition(async () => {
      const res = await markAsReadAction({ ids });
      if (res.success) {
        setNotifications((list) => list.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
      }
    });
  }

  const tabs: Array<{ key: 'all' | 'unread'; label: string; href: string }> = [
    { key: 'all', label: t.all, href: '/dashboard/notifications' },
    { key: 'unread', label: t.unread, href: '/dashboard/notifications?tab=unread' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markRead(notifications.filter((n) => !n.isRead).map((n) => n.id))}
            disabled={isPending}
            className="text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            {t.markAllRead}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-semibold text-[var(--foreground)]">
            {activeTab === 'unread' ? t.emptyUnread : t.emptyAll}
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-5 py-4 ${!n.isRead ? 'bg-[var(--primary)]/[0.03]' : ''}`}
            >
              <span className="text-xl leading-none mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">{n.title}</span>
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
                  <span className="text-xs text-[var(--muted-foreground)]">{t.types[n.type as keyof typeof t.types] ?? n.type}</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{n.body}</p>
                <p className="text-xs text-[var(--muted-foreground)]/70 mt-1">
                  {new Date(n.createdAt).toLocaleString(locale)}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead([n.id])}
                  disabled={isPending}
                  className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
                >
                  {t.markRead}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {initialPagination.total > 0 && (
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          {t.showing.replace('{shown}', String(notifications.length)).replace('{total}', String(initialPagination.total))}
        </p>
      )}
      </div>
    </div>
  );
}
