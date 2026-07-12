'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { markAsReadAction } from '@/modules/notifications/actions';

interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  NEW_ORDER: '🛒',
  ORDER_STATUS: '📦',
  LOW_STOCK: '⚠️',
  SYSTEM: '⚙️',
};

const TYPE_LABEL: Record<string, string> = {
  NEW_ORDER: 'New order',
  ORDER_STATUS: 'Order update',
  LOW_STOCK: 'Low stock',
  SYSTEM: 'System',
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
    { key: 'all', label: 'All', href: '/dashboard/notifications' },
    { key: 'unread', label: 'Unread', href: '/dashboard/notifications?tab=unread' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markRead(notifications.filter((n) => !n.isRead).map((n) => n.id))}
            disabled={isPending}
            className="text-sm font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-semibold text-[var(--foreground)]">
            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Order alerts, stock alerts, and system notifications will appear here
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
                  <span className="text-xs text-[var(--muted-foreground)]">{TYPE_LABEL[n.type] ?? n.type}</span>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{n.body}</p>
                <p className="text-xs text-[var(--muted-foreground)]/70 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead([n.id])}
                  disabled={isPending}
                  className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {initialPagination.total > 0 && (
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Showing {notifications.length} of {initialPagination.total} notifications
        </p>
      )}
    </div>
  );
}
