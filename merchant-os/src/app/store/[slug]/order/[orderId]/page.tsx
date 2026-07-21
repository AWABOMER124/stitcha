import * as service from '@/modules/storefront/services/storefront.service';
import Link from 'next/link';

const STATUS_STEPS = [
  { key: 'NEW', label: 'تم الطلب', icon: '📋' },
  { key: 'ACCEPTED', label: 'مقبول', icon: '✅' },
  { key: 'PREPARING', label: 'يُحضَّر', icon: '👨‍🍳' },
  { key: 'READY', label: 'جاهز', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'في الطريق', icon: '🚚' },
  { key: 'DELIVERED', label: 'تم التسليم', icon: '🎉' },
];
const STATUS_ORDER = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default async function OrderPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  let order: Awaited<ReturnType<typeof service.getOrderStatus>> | null = null;
  try { order = await service.getOrderStatus(orderId); } catch {}

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">{order?.status === 'DELIVERED' ? '🎉' : order?.status === 'CANCELLED' ? '❌' : '✅'}</div>
          <h1 className="text-2xl font-bold text-stone-900">{order ? `طلب رقم ${order.orderNumber}` : 'تم استلام طلبك'}</h1>
          <p className="text-stone-500 text-sm mt-1">{order ? new Date(order.createdAt).toLocaleString('ar-SA') : ''}</p>
        </div>

        {/* Timeline */}
        {order && order.status !== 'CANCELLED' && (
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-bold text-stone-900 mb-4">حالة الطلب</h2>
            <div className="flex items-start justify-between">
              {STATUS_STEPS.map((step, i) => {
                const cur = STATUS_ORDER.indexOf(order.status);
                const done = i <= cur;
                const active = i === cur;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    {i > 0 && <div className={`h-0.5 w-full -mt-4 mb-0 ${i <= cur ? 'bg-emerald-400' : 'bg-stone-200'}`} style={{ marginTop: '-20px', zIndex: 0 }} />}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${active ? 'shadow-lg scale-110' : ''} ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`} style={active ? { background: '#b91c1c', color: 'white' } : {}}>
                      {step.icon}
                    </div>
                    <span className={`mt-1 text-[9px] font-medium text-center leading-tight ${active ? 'text-red-700' : done ? 'text-emerald-600' : 'text-stone-400'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        {order && (
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 font-bold text-stone-900">تفاصيل الطلب</div>
            <div className="divide-y divide-stone-50">
              {order.items.map((item, i: number) => {
                const snap = item.productSnapshot as { name?: string } | null;
                return (
                  <div key={i} className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-stone-800 font-medium">{snap?.name ?? 'منتج'} × {item.quantity}</span>
                    <span className="text-stone-600">{Number(item.total).toLocaleString()} SDG</span>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex justify-between font-bold">
              <span>الإجمالي</span>
              <span className="text-red-700">{Number(order.total).toLocaleString()} SDG</span>
            </div>
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-sm text-stone-500">شكراً لطلبك! سنتواصل معك على رقم الهاتف المسجّل</p>
          <Link href={`/store/${slug}`} className="inline-block px-6 py-3 rounded-xl text-white font-bold bg-red-700">
            طلب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
