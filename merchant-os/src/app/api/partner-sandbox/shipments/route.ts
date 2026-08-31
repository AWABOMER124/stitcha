import { authenticateSandbox, createSandboxShipment } from '@/modules/delivery-partners/services/partner-sandbox.service';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
export async function POST(request: Request) {
  if (!checkRateLimit(`sandbox-create:${getClientIp(request)}`, 60, 60000)) return Response.json({ error: 'Rate limit' }, { status: 429 });
  let store;
  try { store = await authenticateSandbox(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''); }
  catch { return Response.json({ error: 'Invalid sandbox credential' }, { status: 401 }); }
  try {
    const row = await createSandboxShipment(store.partnerId, request.headers.get('idempotency-key') ?? '');
    return Response.json({ sandbox: true, providerReference: row.id, trackingCode: row.trackingCode, status: row.status, orderStatus: row.orderStatus, labelPath: `/partner/sandbox/labels/${row.id}` }, { status: 201 });
  } catch { return Response.json({ error: 'Invalid idempotency key or sandbox quota exceeded' }, { status: 400 }); }
}
