'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { markAsReadAction } from '@/modules/notifications/actions';
import { useLocale } from '@/lib/i18n/context';
import { LiveRefresh } from '@/components/shared/live-refresh';
import { notificationHref } from '@/lib/notifications/notification-link';

export interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string | Date;
  metadata?: unknown;
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
  loadError,
}: {
  initialNotifications: Notification[];
  initialPagination: { page: number; limit: number; total: number; totalPages: number };
  activeTab: 'all' | 'unread';
  loadError?:string;
}) {
  const { dict, locale } = useLocale();
  const t = dict.notificationsPage;
  const [readIds,setReadIds]=useState<string[]>([]);
  const notifications=initialNotifications.map(n=>readIds.includes(n.id)?{...n,isRead:true}:n);
  const [error,setError]=useState(loadError||'');
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markRead(ids: string[]) {
    startTransition(async () => {
      const res = await markAsReadAction({ ids });
      if(!res.success){setError(res.error);return;}
      setError('');
      if (res.success) {
        setReadIds(list=>[...new Set([...list,...ids])]);
      }
    });
  }

  const tabs: Array<{ key: 'all' | 'unread'; label: string; href: string }> = [
    { key: 'all', label: t.all, href: '/dashboard/notifications' },
    { key: 'unread', label: t.unread, href: '/dashboard/notifications?tab=unread' },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh intervalMs={15000}/>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
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
              id={"notification-"+n.id}
              className={`scroll-mt-6 target:ring-2 target:ring-inset target:ring-emerald-500 flex items-start gap-3 px-5 py-4 ${!n.isRead ? 'bg-[var(--primary)]/[0.03]' : ''}`}
            >
              <span className="text-xl leading-none mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={notificationHref(n.metadata,n)} onClick={()=>!n.isRead&&markRead([n.id])} className="text-sm font-semibold text-[var(--foreground)] hover:underline">{n.title}</Link>
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />}
                  <span className="text-xs text-[var(--muted-foreground)]">{t.types[n.type as keyof typeof t.types] ?? n.type}</span>
                </div>
                <Link href={notificationHref(n.metadata,n)} onClick={()=>!n.isRead&&markRead([n.id])} className="mt-0.5 block text-sm text-[var(--muted-foreground)] hover:underline">{n.body}</Link>
                <Link href={notificationHref(n.metadata,n)} onClick={() => !n.isRead && markRead([n.id])} className="mt-2 inline-flex text-xs font-bold text-[var(--primary)]">{locale === 'ar' ? 'فتح التفاصيل' : 'Open details'} →</Link>
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
