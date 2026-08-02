import * as service from '@/modules/storefront/services/storefront.service';
import Link from 'next/link';
import { LiveOrderStatus } from './_live_status';

export default async function OrderPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  let order: Awaited<ReturnType<typeof service.getOrderStatus>> | null = null;
  try { order = await service.getOrderStatus(orderId); } catch {}

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {order ? (
          <LiveOrderStatus
            slug={slug}
            orderId={orderId}
            initialOrder={{
              orderNumber: order.orderNumber,
              status: order.status,
              createdAt: order.createdAt,
              total: Number(order.total),
              items: order.items.map((item) => ({ ...item, total: Number(item.total) })),
            }}
          />
        ) : (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-stone-900">تم استلام طلبك</h1>
            <Link href={`/store/${slug}`} className="inline-block px-6 py-3 rounded-xl text-white font-bold bg-red-700">
              طلب جديد
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
