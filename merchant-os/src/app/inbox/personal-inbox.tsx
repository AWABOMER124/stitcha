'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { getPersonalMessagesAction, markPersonalMessagesReadAction } from '@/modules/communications/actions';

import { MessagePreferences } from '@/modules/communications/components/message-preferences';
import { safeNotificationPath } from '@/lib/notifications/notification-link';

type InboxData = Extract<Awaited<ReturnType<typeof getPersonalMessagesAction>>, { success: true }>['data'];
export function PersonalInbox({ initial, back, selectedMessageId }: { initial: InboxData; back: string; selectedMessageId?:string }) {
  const [data, setData] = useState(initial), [message, setMessage] = useState(''), [busy, start] = useTransition();
  async function read(ids: string[]) {
    start(async () => { const r = await markPersonalMessagesReadAction(ids); if (!r.success) { setMessage(r.error); return; } const next = await getPersonalMessagesAction(selectedMessageId); if (next.success) setData(next.data); });
  }
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-4xl space-y-6">
    <Link href={back} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><ArrowRight className="size-4" />العودة إلى حسابك</Link>
    {selectedMessageId&&<Link href="/inbox" className="block text-sm font-bold text-emerald-800">كل رسائل المنصة ←</Link>}
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#071e27] p-7 text-white"><div><p className="text-sm text-emerald-200">رسائل وصلة</p><h1 className="mt-2 text-3xl font-black">كل ما يهم حسابك</h1><p className="mt-2 text-sm text-slate-300">{data.unread} رسالة غير مقروءة</p></div><Bell className="size-10 text-emerald-300" /></header>
    {message && <p role="status" className="rounded-xl border bg-white p-4 text-sm">{message}</p>}
    <div className="flex items-center justify-between"><h2 className="text-lg font-black">الرسائل الواردة</h2><button disabled={busy || !data.unread} onClick={() => void read(data.rows.filter(x => !x.readAt).map(x => x.id))} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 disabled:opacity-40"><CheckCheck className="size-4" />تحديد المعروض كمقروء</button></div>
    <div className="space-y-3">{data.rows.map(row => <article id={"message-"+row.id} key={row.id} className={`scroll-mt-6 target:ring-2 target:ring-emerald-500 rounded-2xl border bg-white p-5 ${row.readAt ? '' : 'border-emerald-300 shadow-sm'}`}><div className="flex items-start justify-between gap-4"><h3 className="font-black">{row.title}</h3><time className="shrink-0 text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString('ar')}</time></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{row.body}</p><div className="mt-4 flex items-center gap-5">{row.actionPath && <Link href={safeNotificationPath(row.actionPath) || "/inbox"} onClick={() => void read([row.id])} className="text-sm font-black text-emerald-800">فتح التفاصيل ←</Link>}{!row.readAt && <button disabled={busy} onClick={() => void read([row.id])} className="text-sm text-slate-500">تمت القراءة</button>}</div></article>)}{!data.rows.length && <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><Bell className="mx-auto size-8 text-slate-300" /><h3 className="mt-4 font-bold">صندوقك جاهز</h3><p className="mt-2 text-sm text-slate-500">ستظهر هنا رسائل المنصة الخاصة بحسابك.</p></div>}</div>
    <MessagePreferences initial={data.preference} />
  </div></main>;
}
