import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { authenticateSandbox, createSandboxReturnShipment } from '@/modules/delivery-partners/services/partner-sandbox.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkRateLimit(`sandbox-return:${getClientIp(request)}`, 60, 60_000)) {
    return Response.json({ error: 'Rate limit' }, { status: 429 });
  }

  let store;
  try {
    store = await authenticateSandbox(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  } catch {
    return Response.json({ error: 'Invalid sandbox credential' }, { status: 401 });
  }

  try {
    const row = await createSandboxReturnShipment(
      store.partnerId,
      (await params).id,
      request.headers.get('idempotency-key') ?? '',
    );
    return Response.json({
      sandbox: true,
      kind: row.kind,
      parentShipmentId: row.parentShipmentId,
      providerReference: row.id,
      trackingCode: row.trackingCode,
      status: row.status,
      orderStatus: row.orderStatus,
      labelPath: `/partner/sandbox/labels/${row.id}`,
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'Forward shipment must exist, be delivered and not already have a return waybill' }, { status: 409 });
  }
}
