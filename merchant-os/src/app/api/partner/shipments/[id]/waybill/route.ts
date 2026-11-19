import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { AppError } from '@/lib/errors';
import { partnerWaybill } from '@/modules/delivery-partners/services/partner-waybill.service';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{id:string}> }) { const {partnerId} = await requireDeliveryPartner(); try {
 const {id} = await params;
 const result = await partnerWaybill(partnerId,id,new URL(request.url).searchParams.get('kind') === 'return'); return new Response(result.bytes, { headers: { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="' + result.filename + '"', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
 } catch (error) { const status = error instanceof AppError ? error.statusCode : 502; return Response.json({ error: error instanceof AppError ? error.message : 'تعذر تحميل البوليصة. حاول مجددًا بعد قليل.' }, { status, headers: { 'cache-control': 'private, no-store' } }); }
}
