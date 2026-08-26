import { auth } from '@/lib/auth/config';
import { getOrderPaymentProof } from '@/modules/store-payments/store-payments.service';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: RouteContext<'/api/order-payments/[id]/proof'>) {
  const session = await auth();
  const merchantId = session?.user?.merchantId;
  if (!merchantId) return new Response('Unauthorized', { status: 401 });
  try {
    const { id } = await context.params;
    const proof = await getOrderPaymentProof(id, merchantId);
    return new Response(Buffer.from(proof.body), { headers: { 'Content-Type': proof.mimeType, 'Content-Length': String(proof.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
