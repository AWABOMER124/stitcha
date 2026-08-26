import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { normalizePrivateEvidence } from '@/services/storage/private-evidence-input';
import { submitManualSubscriptionPayment } from '@/modules/subscription-payments/subscription-payments.service';
import { handleError } from '@/lib/errors/handler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const merchantId = session?.user?.merchantId;
    if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkRateLimit(`subscription-payment:${merchantId}:${getClientIp(request)}`, 10, 60 * 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    const form = await request.formData();
    const proof = form.get('proof');
    if (!(proof instanceof File)) return NextResponse.json({ error: 'Transfer receipt is required' }, { status: 400 });
    const transferredAtRaw = String(form.get('transferredAt') ?? '');
    const transferredAt = transferredAtRaw ? new Date(transferredAtRaw) : undefined;
    if (transferredAt && Number.isNaN(transferredAt.getTime())) return NextResponse.json({ error: 'Invalid transfer date' }, { status: 400 });
    const result = await submitManualSubscriptionPayment(merchantId, {
      paymentAccountId: String(form.get('paymentAccountId') ?? ''), transactionRef: String(form.get('transactionRef') ?? ''), senderName: String(form.get('senderName') ?? ''), transferredAt,
    }, await normalizePrivateEvidence(proof));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode });
  }
}
