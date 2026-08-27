import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { handleError } from '@/lib/errors/handler';
import { normalizePrivateEvidence } from '@/services/storage/private-evidence-input';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { ValidationError } from '@/lib/errors';
import type { PrivateEvidence } from '@/services/storage/private-evidence-input';
import { ZodError } from 'zod';

export const runtime = 'nodejs';

export async function POST(request: Request, context: RouteContext<'/api/store/[slug]/orders'>) {
  try {
    const { slug } = await context.params;
    if (!checkRateLimit(`store-order:${slug}:${getClientIp(request)}`, 20, 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    const form = await request.formData();
    const paymentMethod = String(form.get('paymentMethod') ?? 'CASH');
    const itemsRaw = String(form.get('items') ?? '[]');
    let items: unknown;
    try { items = JSON.parse(itemsRaw); } catch { items = []; }
    const transferredAtRaw = String(form.get('transferredAt') ?? '');
    const deliveryLatRaw = String(form.get('deliveryLat') ?? '');
    const deliveryLngRaw = String(form.get('deliveryLng') ?? '');
    const data = placeOrderSchema.parse({
      customerName: String(form.get('customerName') ?? ''),
      customerPhone: String(form.get('customerPhone') ?? ''),
      deliveryMethod: String(form.get('deliveryMethod') ?? 'PICKUP'),
      customerAddress: String(form.get('customerAddress') ?? '') || undefined,
      deliveryLat: deliveryLatRaw ? Number(deliveryLatRaw) : undefined,
      deliveryLng: deliveryLngRaw ? Number(deliveryLngRaw) : undefined,
      notes: String(form.get('notes') ?? '') || undefined,
      items,
      paymentMethod,
      paymentAccountId: String(form.get('paymentAccountId') ?? '') || undefined,
      transactionRef: String(form.get('transactionRef') ?? '') || undefined,
      senderName: String(form.get('senderName') ?? '') || undefined,
      transferredAt: transferredAtRaw || undefined,
    });
    const proofInput = form.get('proof');
    let evidence: PrivateEvidence | undefined;
    if (paymentMethod === 'MANUAL_TRANSFER') {
      if (!(proofInput instanceof File)) throw new ValidationError('Transfer receipt is required');
      evidence = await normalizePrivateEvidence(proofInput);
    }
    const result = await placeOrder(slug, data, evidence);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid order' }, { status: 400 });
    const handled = handleError(error);
    return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode });
  }
}
