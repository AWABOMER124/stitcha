'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface NotificationSummaryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: unknown;
}

/** Read-only polling stays out of the Server Action/navigation queue. */
export function useNotificationSummary() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationSummaryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const current = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const mutations = useRef(0);

  const apply = useCallback((data: { unreadCount: number; notifications: NotificationSummaryItem[] }) => {
    if (!mounted.current) return;
    setUnreadCount(data.unreadCount);
    setNotifications(data.notifications);
    setLoaded(true);
  }, []);

  const refresh = useCallback(async () => {
    if (document.visibilityState !== 'visible' || current.current || mutations.current) return;
    const controller = new AbortController();
    const version = revision.current;
    current.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/notifications/summary', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (response.ok) { const data = await response.json(); if (version === revision.current) apply(data); }
    } catch { /* Retain the last known badge while offline. */ }
    finally {
      window.clearTimeout(timeout);
      if (current.current === controller) current.current = null;
      if (mounted.current) setLoaded(true);
    }
  }, [apply]);

  const markRead = useCallback(async (ids: string[]) => {
    const version = ++revision.current;
    mutations.current += 1;
    current.current?.abort();
    try {
      const response = await fetch('/api/notifications/summary', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }), signal: AbortSignal.timeout(10000) });
      if (response.ok) { const data = await response.json(); if (version === revision.current) apply(data); }
    } catch { /* Opening the destination must not depend on marking a badge. */ }
    finally { mutations.current -= 1; }
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    const visible = () => void refresh();
    document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      current.current?.abort();
      current.current = null;
    };
  }, [refresh]);

  return { unreadCount, notifications, loaded, refresh, markRead };
}
