import { sandboxWebhook } from '@/modules/delivery-partners/services/partner-sandbox.service';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!checkRateLimit(`sandbox-webhook:${getClientIp(request)}`, 120, 60000)) return Response.json({ error: 'Rate limit' }, { status: 429 });
  if (Number(request.headers.get('content-length')) > 32768) return Response.json({ error: 'Payload too large' }, { status: 413 });
  try { return Response.json({ sandbox: true, ...await sandboxWebhook((await params).token, await request.text(), request.headers.get('x-wasla-signature')) }); }
  catch { return Response.json({ error: 'Invalid signature, reference or state transition' }, { status: 400 }); }
}
