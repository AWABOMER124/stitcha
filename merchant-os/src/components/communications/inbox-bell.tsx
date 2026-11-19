'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getPersonalUnreadCountAction } from '@/modules/communications/actions';

export function InboxBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => { if (document.visibilityState !== 'visible') return; void getPersonalUnreadCountAction().then(r => { if (alive && r.success) setCount(r.data); }); };
    refresh(); const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <Link href="/inbox" aria-label={`الرسائل${count ? `، ${count} غير مقروءة` : ''}`} className="relative inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold text-slate-700 hover:border-emerald-400">
    <Bell className="size-4" /><span>الرسائل</span>{count > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-xs text-white">{count > 99 ? '99+' : count}</span>}
  </Link>;
}
