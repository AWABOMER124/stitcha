'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Link2, Copy, MessageCircle, Settings2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { changeQuoteAction, switchSaleToOnlineAction } from '@/modules/assisted-sales/actions';
import { renderSalesMessage, type SavedQuote } from '@/modules/assisted-sales/policy';
import { QuoteEditor } from './quote-editor';
import { SalesSettingsEditor } from './settings-editor';
import { STATE_LABELS, buttonClass, inputClass, type SalesQuoteRow, type SalesWorkspaceProps } from './types';

const eventLabels: Record<string, string> = { CREATED: 'إنشاء العرض', REVISED: 'تعديل وإصدار رابط جديد', APPROVE: 'الموافقة على الخصم', CANCEL: 'إلغاء العرض', CHECKOUT_STARTED: 'إنشاء طلب العميل', PAID: 'تأكيد الدفع من البوابة', SWITCHED_TO_ONLINE: 'تحويل الطلب للدفع الإلكتروني' };
export function SalesWorkspace(props: SalesWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'offers' | 'settings'>('offers');
  const [editing, setEditing] = useState<SalesQuoteRow | 'new' | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedQuote, setSavedQuote] = useState<SavedQuote | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!savedQuote) return;
    const card = workspaceRef.current?.querySelector<HTMLElement>('[data-save-confirmation]');
    if (card) { card.scrollIntoView({ block: 'start' }); card.focus({ preventScroll: true }); }
  }, [savedQuote]);
  function saved(result: SavedQuote) {
    setSavedId(result.id); setSavedQuote(result); setEditing(null);
    setFeedback(result.status === 'PENDING_APPROVAL' ? 'تم حفظ العرض وإرساله للموافقة.' : 'العرض جاهز. اضغط «مشاركة واتساب» لإرساله للعميل.');
  }
  const money = (v: number, currency = props.currency) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(v);
  const date = (v: string) => new Date(v).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Riyadh' });
  function decide(quote: SalesQuoteRow, decision: 'APPROVE' | 'CANCEL') {
    startTransition(async () => {
      const result = await changeQuoteAction(quote.id, quote.version, decision);
      setFeedback(result.success ? decision === 'APPROVE' ? 'تمت الموافقة. الرابط جاهز للإرسال.' : 'تم إلغاء العرض.' : result.error);
      if (result.success) router.refresh();
    });
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setFeedback('تم نسخ الرابط.'); }
    catch { setFeedback('تعذر النسخ التلقائي. افتح معاينة العرض وانسخ عنوانه.'); }
  }
  function switchOnline(quote: SalesQuoteRow) {
    if (!window.confirm('تحويل نفس الطلب للدفع الإلكتروني؟ يجب سداد المبلغ قبل تجهيزه، ولن يُحصّل عند الاستلام.')) return;
    startTransition(async () => {
      const result = await switchSaleToOnlineAction(quote.id, quote.version);
      setFeedback(result.success ? 'تم التحويل. أرسل رابط الطلب للعميل ليكمل الدفع.' : result.error);
      if (result.success) router.refresh();
    });
  }
  return <div ref={workspaceRef} className="min-w-0 space-y-4 sm:space-y-6" dir="rtl">
    {!editing && <><header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black sm:text-3xl">المبيعات الخاصة</h1><p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">أنشئ العرض وشاركه مع العميل على واتساب.</p></div>
      {props.canCreate && <button className={`${buttonClass} w-full sm:w-auto`} disabled={!props.settings.enabled} onClick={() => { setTab('offers'); setSavedId(null); setSavedQuote(null); setFeedback(''); setEditing('new'); }}><Plus size={18} />عرض جديد</button>}</header>
    <div className="flex flex-wrap items-center gap-2"><button className={`min-h-12 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'offers' ? 'bg-[#087d82] text-white' : 'border'}`} onClick={() => setTab('offers')}>العروض</button>{props.owner && <button className={`flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'settings' ? 'bg-[#087d82] text-white' : 'border'}`} onClick={() => { setTab('settings'); setEditing(null); }}><Settings2 size={16} />الإعدادات والفريق</button>}<button aria-label="تحديث الحالات" onClick={() => router.refresh()} className="ms-auto flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs"><RefreshCw size={17} /><span className="hidden sm:inline">تحديث الحالات</span></button></div></>}
    {!props.settings.enabled && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">المبيعات الخاصة متوقفة. يمكن للمالك إعادة تفعيلها من الإعدادات.</p>}
    {!props.gatewayReady && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900">الدفع الإلكتروني غير جاهز لهذا المتجر. يمكنك تجهيز العروض، وسيحتاج تحصيلها إلكترونيًا إلى تفعيل بوابة الدفع واستكمال التوثيق. <Link href="/dashboard/storefront/payments" className="font-bold underline">إعدادات الدفع</Link></div>}
    {feedback && <p role="status" className="rounded-xl border bg-[var(--card)] p-3 text-sm">{feedback}</p>}
    {savedQuote && !editing && tab === 'offers' && <section data-save-confirmation tabIndex={-1} aria-label="نتيجة حفظ العرض" className="scroll-mt-3 space-y-3 rounded-2xl border border-emerald-300 bg-[var(--card)] p-4 focus:outline-none"><h2 className="flex items-center gap-2 font-bold"><CheckCircle2 size={20} className="shrink-0 text-emerald-700" />{savedQuote.status === 'PENDING_APPROVAL' ? 'العرض بانتظار الموافقة' : 'جاهز للإرسال للعميل'}</h2><p className="text-sm">{savedQuote.customerName} · {money(savedQuote.total, savedQuote.currency)}</p>{savedQuote.token && <><a className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white" href={`https://wa.me/${savedQuote.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(renderSalesMessage(props.settings.whatsappTemplate, { customer: savedQuote.customerName, store: props.storeName, total: savedQuote.total.toFixed(2), currency: savedQuote.currency, link: `${props.origin}/pay/${savedQuote.token}` }))}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />مشاركة واتساب</a><button type="button" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm" onClick={() => void copy(`${props.origin}/pay/${savedQuote.token}`)}><Copy size={16} />نسخ الرابط</button></>}</section>}
    {tab === 'settings' ? <SalesSettingsEditor settings={props.settings} staff={props.staff} /> : editing ? <QuoteEditor key={editing === 'new' ? 'new' : editing.id} context={props} quote={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={saved} /> : <>
      <form className="grid items-end gap-3 rounded-2xl border bg-[var(--card)] p-4 sm:flex sm:flex-wrap"><label className="min-w-0 flex-1 text-sm font-bold">ابحث عن عميل<input name="q" className={inputClass} defaultValue={props.search} placeholder="الاسم أو رقم واتساب" /></label><details open={Boolean(props.status)} className="min-w-0 sm:min-w-44"><summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">تصفية حسب الحالة</summary><label className="block text-xs">الحالة<select name="status" className={inputClass} defaultValue={props.status}><option value="">كل الحالات</option><option value="OPEN">عروض مفتوحة</option><option value="PENDING_APPROVAL">بانتظار الموافقة</option><option value="CONVERTED">تحولت لطلبات</option><option value="CANCELLED">ملغية</option></select></label></details><div className="flex gap-2"><button className={`${buttonClass} flex-1`}>بحث</button><Link href="/dashboard/sales" className="inline-flex min-h-12 items-center justify-center rounded-xl border px-3 py-2 text-sm">مسح</Link></div></form>
      <p className="text-xs text-[var(--muted-foreground)]">{props.total} عرض · الأوقات بتوقيت السعودية · {props.owner ? 'جميع عروض الفريق' : 'العروض المتاحة لصلاحياتك'}</p>
      {!props.quotes.length ? <div className="rounded-2xl border border-dashed bg-[var(--card)] px-6 py-14 text-center"><Link2 className="mx-auto mb-4 text-[var(--primary)]" size={32} /><h2 className="text-lg font-bold">كل اتفاق يبدأ بعرض واضح</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">أنشئ عرضًا، حدد السعر المتفق عليه، وشارك الرابط مع العميل.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{props.quotes.map(quote => {
        const link = quote.token ? `${props.origin}/pay/${quote.token}` : '';
        const shareable = quote.state === 'OPEN' || quote.state === 'CONVERTED';
        const message = renderSalesMessage(props.settings.whatsappTemplate, { customer: quote.customerName, store: props.storeName, total: quote.total.toFixed(2), currency: quote.currency, link });
        const author = props.staff.find(s => s.userId === quote.createdById)?.name ?? 'عضو سابق';
        return <article key={quote.id} data-quote-id={quote.id} tabIndex={-1} className={`min-w-0 scroll-mt-3 rounded-2xl border bg-[var(--card)] p-4 focus:outline-none sm:p-5 ${savedId === quote.id ? 'ring-2 ring-[#087d82]' : ''}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-black">{quote.customerName}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]" dir="ltr">{quote.customerPhone}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${quote.state === 'PAID' ? 'bg-emerald-100 text-emerald-800' : quote.state === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-900' : 'bg-[var(--muted)]'}`}>{STATE_LABELS[quote.state] ?? quote.state}</span></div>
          <div className="my-5 flex flex-wrap items-end justify-between gap-2"><p className="text-2xl font-black">{money(quote.total, quote.currency)}</p><p className="text-xs text-[var(--muted-foreground)]">{quote.items.reduce((s, i) => s + i.quantity, 0)} قطعة · {quote.paymentMethod === 'CASH' ? 'عند الاستلام' : 'دفع إلكتروني'}</p></div>
          <div className="space-y-2 border-y py-3 text-xs leading-6"><p>مسؤول البيع: <strong>{author}</strong></p><p>بدء إتمام العرض قبل: {date(quote.expiresAt)}</p>{quote.discountPercent > 0 && <p>أكبر خصم على منتج: {quote.discountPercent}٪</p>}{quote.order && <Link href={`/dashboard/orders/${quote.order.id}`} className="inline-block font-bold text-[var(--primary)]">فتح الطلب {quote.order.orderNumber} ←</Link>}</div>
          <div className="mt-4 flex flex-wrap gap-2 [&_button]:min-h-11 [&_a]:min-h-11">{shareable && link && <><a className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white sm:w-auto" href={`https://wa.me/${quote.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />مشاركة واتساب</a><button className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" onClick={() => void copy(link)}><Copy size={15} />نسخ الرابط</button><a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl border px-3 py-2 text-xs">معاينة</a></>}
            {!quote.order && quote.status !== 'CANCELLED' && <>{props.canApprove && quote.status === 'PENDING_APPROVAL' && quote.createdById !== props.userId && <button className={buttonClass} disabled={pending} onClick={() => decide(quote, 'APPROVE')}><CheckCircle2 size={16} />موافقة الخصم</button>}{props.canCreate && (props.owner || quote.createdById === props.userId) && <button className="rounded-xl border px-3 py-2 text-xs" onClick={() => setEditing(quote)}>تعديل وتجديد</button>}<button className="rounded-xl border px-3 py-2 text-xs text-red-600" disabled={pending} onClick={() => { if (window.confirm('إلغاء العرض وإيقاف رابطه؟')) decide(quote, 'CANCEL'); }}>إلغاء</button></>}
          </div>
          {props.canCreate && props.gatewayReady && quote.paymentMethod === 'CASH' && quote.order?.status === 'NEW' && quote.order.payment?.status === 'PENDING' && <button disabled={pending} onClick={() => switchOnline(quote)} className="mt-3 text-xs font-bold text-[var(--primary)] underline">تحويل نفس الطلب للدفع الإلكتروني</button>}
          <details className="mt-4 text-xs"><summary className="cursor-pointer text-[var(--muted-foreground)]">تفاصيل المنتجات وسجل العمليات</summary><ul className="mt-3 space-y-2">{quote.items.map(i => <li key={i.productId} className="flex justify-between gap-2"><span>{i.name} × {i.quantity}</span><span>{money(i.total, quote.currency)}</span></li>)}</ul><p className="mt-2">الشحن: {money(quote.deliveryFee, quote.currency)}</p>{quote.notes && <p className="mt-2 whitespace-pre-wrap">{quote.notes}</p>}<ol className="mt-4 space-y-2 border-t pt-3">{quote.events.map(e => <li key={e.id}>{eventLabels[e.type] ?? e.type} · {e.actorId ? props.staff.find(s => s.userId === e.actorId)?.name ?? 'عضو سابق' : 'النظام / العميل'} · {date(e.at)}</li>)}</ol></details>
        </article>;
      })}</div>}
      {props.total > 30 && <nav aria-label="صفحات العروض" className="flex items-center justify-center gap-5">{props.page > 1 && <Link className="rounded-xl border px-4 py-2" href={`?${new URLSearchParams({ q: props.search, status: props.status, page: String(props.page - 1) })}`}>السابق</Link>}<span className="text-sm">صفحة {props.page}</span>{props.page * 30 < props.total && <Link className="rounded-xl border px-4 py-2" href={`?${new URLSearchParams({ q: props.search, status: props.status, page: String(props.page + 1) })}`}>التالي</Link>}</nav>}
    </>}
  </div>;
}
