import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { handleError } from '@/lib/errors/handler';
import { normalizePrivateEvidence } from '@/services/storage/private-evidence-input';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { ValidationError } from '@/lib/errors';
import type { PrivateEvidence } from '@/services/storage/private-evidence-input';
import { ZodError } from 'zod';
import { AFFILIATE_COOKIE } from '@/modules/store-affiliates/store-affiliates.service';
import { createMarketOrderCheckout, getMerchantOnlinePaymentStatus } from '@/modules/paymob-payments/market-payments.service';
import { getMerchantBySlug } from '@/modules/storefront/services/storefront.service';
import { resolvePublicOrigin } from '@/lib/public-origin';
import * as ordersRepo from '@/modules/orders/repositories/orders.repository';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: RouteContext<'/api/store/[slug]/orders'>) {
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
      customerState: String(form.get('customerState') ?? '') || undefined,
      customerCity: String(form.get('customerCity') ?? '') || undefined,
      customerDistrict: String(form.get('customerDistrict') ?? '') || undefined,
      customerAddressDescription: String(form.get('customerAddressDescription') ?? '') || undefined,
      deliveryAddressVersion: form.get('deliveryAddressVersion') || undefined,
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
    if (paymentMethod === 'ONLINE') {
      const merchant = await getMerchantBySlug(slug);
      if (!merchant || !(await getMerchantOnlinePaymentStatus(merchant.id)).ready) throw new ValidationError('الدفع الإلكتروني غير متاح لهذا المتجر حاليًا.');
    }
    const proofInput = form.get('proof');
    let evidence: PrivateEvidence | undefined;
    if (paymentMethod === 'MANUAL_TRANSFER') {
      if (!(proofInput instanceof File)) throw new ValidationError('Transfer receipt is required');
      evidence = await normalizePrivateEvidence(proofInput);
    }
    const result = await placeOrder(slug, data, evidence, request.cookies.get(AFFILIATE_COOKIE)?.value);
    if (paymentMethod === 'ONLINE') {
      try {
        const checkout = await createMarketOrderCheckout({ orderId: result.orderId, merchantId: result.merchantId, origin: resolvePublicOrigin(request.headers) });
        return NextResponse.json({ orderId: result.orderId, orderNumber: result.orderNumber, checkoutUrl: checkout.checkoutUrl }, { status: 201 });
      } catch (error) {
        const status = await getMerchantOnlinePaymentStatus(result.merchantId);
        if (status.provider === 'PAYMOB') {
          // Keep the order unpaid if upstream creation was ambiguous. A later
          // verified callback must not find an order cancelled by our timeout.
          return NextResponse.json({ orderId: result.orderId, orderNumber: result.orderNumber, paymentPending: true, message: 'الطلب محفوظ وبانتظار تأكيد حالة الدفع.' }, { status: 202 });
        }
        await ordersRepo.updateStatus(result.merchantId, result.orderId, 'CANCELLED', 'Online checkout could not start').catch(() => undefined);
        throw error;
      }
    }
    return NextResponse.json({ orderId: result.orderId, orderNumber: result.orderNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid order' }, { status: 400 });
    const handled = handleError(error);
    return NextResponse.json({ error: handled.error.message }, { status: handled.error.statusCode });
  }
}
