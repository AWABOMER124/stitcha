import Image from 'next/image';
import { CheckCircle2, ShieldCheck, Package, Store } from 'lucide-react';
import type { SalesQuote } from '@prisma/client';
import { quoteState, type QuoteItem, type SalesSettings } from '@/modules/assisted-sales/policy';
import { PublicQuoteCheckout } from './checkout';

type ViewQuote = SalesQuote & { merchant: { name: string; logo: string | null; status: string; storefrontSettings: { theme: unknown } | null }; order: { orderNumber: string; status: string; payment: { status: string } | null } | null };

export function PublicQuoteView({ quote, settings, token }: { quote: ViewQuote; settings: SalesSettings; token: string }) {
  const state = quoteState(quote);
  const unavailable = ['EXPIRED', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'].includes(state) || quote.merchant.status !== 'ACTIVE' || (!settings.enabled && !quote.order);
  const paid = state === 'PAID';
  const cashConfirmed = state === 'CONVERTED' && quote.paymentMethod === 'CASH';
  const items = quote.items as unknown as QuoteItem[];
  const money = (v: number) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: quote.currency }).format(v);
  const theme = quote.merchant.storefrontSettings?.theme;
  const rawColor = theme && typeof theme === 'object' && !Array.isArray(theme) ? (theme as Record<string, unknown>).primaryColor : null;
  const color = typeof rawColor === 'string' && /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : '#087d82';
  return <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-14" style={{ '--sales-color': color } as React.CSSProperties}>
    <div className="mx-auto max-w-2xl"><header className="mb-8 flex items-center gap-3">{quote.merchant.logo ? <Image src={quote.merchant.logo} alt="" width={48} height={48} unoptimized className="rounded-2xl object-contain" /> : <div className="rounded-2xl bg-white p-3 text-[var(--sales-color)]"><Store size={24} /></div>}<div><p className="font-black">{quote.merchant.name}</p><p className="mt-1 text-xs text-slate-500">عرض خاص لك · عبر وصلة</p></div></header>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5 sm:p-8">
        {paid || cashConfirmed ? <CheckCircle2 className="mb-4 text-emerald-600" size={38} /> : <Package className="mb-4 text-[var(--sales-color)]" size={32} />}
        <h1 className="text-2xl font-black sm:text-3xl">{unavailable ? 'هذا العرض غير متاح حاليًا' : paid ? 'تم الدفع بنجاح' : cashConfirmed ? 'تم تأكيد طلبك' : settings.checkoutTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{unavailable ? 'تواصل مع موظف المبيعات للحصول على عرض محدث.' : paid ? 'وصل تأكيد الدفع من بوابة الدفع. سيتابع المتجر تجهيز طلبك.' : cashConfirmed ? 'سيتابع المتجر تجهيز طلبك. المبلغ يُدفع عند الاستلام.' : `مرحبًا ${quote.customerName}، راجع تفاصيل اتفاقك وأكمل طلبك بسهولة.`}</p>
        {quote.order && <p className="mt-3 text-xs font-bold">رقم الطلب: {quote.order.orderNumber}</p>}
      </div>
      {!unavailable && <div className="p-5 sm:p-8"><ul className="space-y-4">{items.map(item => <li key={item.productId} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><p className="text-sm font-bold">{item.name}</p><p className="mt-2 text-xs text-slate-500">{item.quantity} × {money(item.unitPrice)}</p></div><strong className="shrink-0 text-sm">{money(item.total)}</strong></li>)}</ul>
        <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">المنتجات</dt><dd>{money(Number(quote.subtotal))}</dd></div><div className="flex justify-between"><dt className="text-slate-500">{quote.deliveryMethod === 'PICKUP' ? 'استلام من المتجر' : 'الشحن'}</dt><dd>{money(Number(quote.deliveryFee))}</dd></div><div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-black"><dt>الإجمالي النهائي</dt><dd>{money(Number(quote.total))}</dd></div></dl>
        <p className="mt-3 text-xs leading-6 text-slate-500">الأسعار نهائية وتشمل أي ضريبة مطبقة. لا تُضاف رسوم أخرى في صفحة الدفع.</p>
        {quote.notes && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7">{quote.notes}</p>}
        {quote.terms && <details className="mt-5 text-sm"><summary className="cursor-pointer font-bold">شروط العرض</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-500">{quote.terms}</p></details>}
        {!paid && !cashConfirmed && <PublicQuoteCheckout token={token} pickup={quote.deliveryMethod === 'PICKUP'} cash={quote.paymentMethod === 'CASH'} started={Boolean(quote.order)} expiresAt={quote.expiresAt.toISOString()} customerName={quote.customerName} customerPhone={quote.customerPhone} />}
      </div>}
      <footer className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 p-4 text-xs text-slate-500"><ShieldCheck size={16} />{quote.paymentMethod === 'ONLINE' ? 'الدفع عبر بوابة آمنة · لا تحتاج إلى إنشاء حساب' : 'طلب واضح ومبلغ ثابت · لا تحتاج إلى إنشاء حساب'}</footer></section>
    </div>
  </main>;
}
