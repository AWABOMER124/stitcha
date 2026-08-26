import { auth } from '@/lib/auth/config';
import { getPaymentProof } from '@/modules/subscription-payments/subscription-payments.service';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/subscriptions/manual-payment/[id]/proof'>) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  try {
    const { id } = await context.params;
    const proof = await getPaymentProof(id, { role: session.user.role, merchantId: session.user.merchantId ?? undefined });
    return new Response(Buffer.from(proof.body), { headers: { 'Content-Type': proof.mimeType, 'Content-Length': String(proof.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
