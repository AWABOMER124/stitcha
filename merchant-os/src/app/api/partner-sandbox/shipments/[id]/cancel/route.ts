import { authenticateSandbox, updateSandboxShipment } from '@/modules/delivery-partners/services/partner-sandbox.service';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkRateLimit(`sandbox-cancel:${getClientIp(request)}`, 60, 60000)) return Response.json({ error: 'Rate limit' }, { status: 429 });
  let store;
  try { store = await authenticateSandbox(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''); }
  catch { return Response.json({ error: 'Invalid sandbox credential' }, { status: 401 }); }
  try { return Response.json({ sandbox: true, ...await updateSandboxShipment(store.partnerId, (await params).id, 'CANCELLED') }); }
  catch { return Response.json({ error: 'Shipment not found or cancellation not allowed after pickup' }, { status: 409 }); }
}
