import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrderDetailAction } from '@/modules/fulfillment/actions';
import { OrderDetailClient } from './_client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getOrderDetailAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        ← العودة للطلبات
      </Link>
      <OrderDetailClient order={result.data} />
    </div>
  );
}
