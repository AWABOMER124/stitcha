import { notFound } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { getSalesSettings } from '@/modules/assisted-sales/service';
import { PublicQuoteView } from './view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'عرض خاص | وصلة', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const quote = await prisma.salesQuote.findUnique({ where: { token }, include: {
    merchant: { select: { name: true, logo: true, status: true, storefrontSettings: { select: { theme: true } } } },
    order: { select: { orderNumber: true, status: true, payment: { select: { status: true } } } },
  } });
  if (!quote || quote.status === 'PENDING_APPROVAL') notFound();
  const settings = await getSalesSettings(quote.merchantId);
  return <PublicQuoteView quote={quote} settings={settings} token={token} />;
}
