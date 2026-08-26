'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OrderStatus } from '@prisma/client';
import { useLocale } from '@/lib/i18n/context';

const STATUS_ORDER = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export interface LiveOrder {
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  total: number;
  items: { productSnapshot: unknown; quantity: number; total: number }[];
  payment: { method: string; status: string; manualProof: { status: string; rejectionReason: string | null } | null } | null;
}

export function LiveOrderStatus({ slug, orderId, initialOrder }: { slug: string; orderId: string; initialOrder: LiveOrder }) {
  const { dict, locale } = useLocale();
  const t = dict.storefrontPublic;
  const [status, setStatus] = useState<OrderStatus>(initialOrder.status);

  const STATUS_STEPS = [
    { key: 'NEW', label: t.statusNew, icon: '📋' },
    { key: 'ACCEPTED', label: t.statusAccepted, icon: '✅' },
    { key: 'PREPARING', label: t.statusPreparing, icon: '👨‍🍳' },
    { key: 'READY', label: t.statusReady, icon: '📦' },
    { key: 'OUT_FOR_DELIVERY', label: t.statusOutForDelivery, icon: '🚚' },
    { key: 'DELIVERED', label: t.statusDelivered, icon: '🎉' },
  ];

  useEffect(() => {
    const source = new EventSource(`/api/tracking/${orderId}`);
    source.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data) as { type: string; status?: OrderStatus };
        if (frame.status) setStatus(frame.status);
      } catch {
        // ignore malformed frames
      }
    };
    return () => source.close();
  }, [orderId]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">{status === 'DELIVERED' ? '🎉' : status === 'CANCELLED' ? '❌' : '✅'}</div>
        <h1 className="text-2xl font-bold text-stone-900">{t.orderNumberLabel.replace('{number}', initialOrder.orderNumber)}</h1>
        <p className="text-stone-500 text-sm mt-1">{new Date(initialOrder.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p>
      </div>

      {status !== 'CANCELLED' && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-bold text-stone-900 mb-4">{t.orderStatusTitle}</h2>
          <div className="flex items-start justify-between">
            {STATUS_STEPS.map((step, i) => {
              const cur = STATUS_ORDER.indexOf(status);
              const done = i <= cur;
              const active = i === cur;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  {i > 0 && <div className={`h-0.5 w-full -mt-4 mb-0 ${i <= cur ? 'bg-emerald-400' : 'bg-stone-200'}`} style={{ marginTop: '-20px', zIndex: 0 }} />}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${active ? 'bg-[var(--primary)] text-white shadow-lg scale-110' : ''} ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                    {step.icon}
                  </div>
                  <span className={`mt-1 text-[9px] font-medium text-center leading-tight ${active ? 'text-[var(--primary)]' : done ? 'text-emerald-600' : 'text-stone-400'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {initialOrder.payment?.method === 'MANUAL_TRANSFER' && <div className={`rounded-2xl border p-4 ${initialOrder.payment.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50' : initialOrder.payment.status === 'FAILED' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><h2 className="font-bold text-stone-900">{locale === 'ar' ? 'حالة التحويل' : 'Transfer status'}</h2><p className="mt-1 text-sm text-stone-700">{initialOrder.payment.status === 'COMPLETED' ? (locale === 'ar' ? 'تمت مطابقة التحويل وسيتم تأكيد الطلب.' : 'Transfer verified. The store can now confirm the order.') : initialOrder.payment.status === 'FAILED' ? (locale === 'ar' ? 'لم تتم مطابقة التحويل. تواصل مع المتجر.' : 'Transfer was not verified. Contact the store.') : (locale === 'ar' ? 'الإشعار قيد مراجعة المتجر.' : 'The receipt is awaiting store review.')}</p>{initialOrder.payment.manualProof?.rejectionReason && <p className="mt-2 text-sm text-red-700">{initialOrder.payment.manualProof.rejectionReason}</p>}</div>}

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 font-bold text-stone-900">{t.orderDetailsTitle}</div>
        <div className="divide-y divide-stone-50">
          {initialOrder.items.map((item, i) => {
            const snap = item.productSnapshot as { name?: string } | null;
            return (
              <div key={i} className="px-4 py-3 flex justify-between text-sm">
                <span className="text-stone-800 font-medium">{snap?.name ?? t.unknownProduct} × {item.quantity}</span>
                <span className="text-stone-600">{Number(item.total).toLocaleString()} SDG</span>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex justify-between font-bold">
          <span>{t.total}</span>
          <span className="text-red-700">{Number(initialOrder.total).toLocaleString()} SDG</span>
        </div>
      </div>

      <div className="text-center space-y-3">
        <p className="text-sm text-stone-500">{t.thankYouNote}</p>
        <Link href={`/store/${slug}`} className="inline-block px-6 py-3 rounded-xl text-white font-bold bg-red-700">
          {t.newOrder}
        </Link>
      </div>
    </div>
  );
}
