'use server';
import { AppError } from '@/lib/errors';
import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthContext,requirePermission } from '@/lib/permissions';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
function failure(error:unknown){return {success:false as const,error:error instanceof ZodError?'راجع المبلغ والعملة ومرجع الإيصال.':error instanceof AppError?(error.statusCode===401?'سجّل دخولك مجددًا لإكمال الإجراء.':error.statusCode===403?'حسابك غير مخول لهذا الإجراء.':error.message):'تعذر حفظ الحركة. حاول مجددًا.'};}
import { recordPartnerCod,confirmMerchantCod } from './services/cod-records.service';
export async function recordPartnerCodAction(shipmentId:string,kind:'COLLECTED'|'REMITTED',input:unknown){const {partnerId,userId}=await requireDeliveryPartner({verified:true});try{await recordPartnerCod(partnerId,userId,shipmentId,kind,input);revalidatePath('/partner/shipments/'+shipmentId);return {success:true as const};}catch(error){return failure(error);}}
export async function confirmMerchantCodAction(shipmentId:string){try{const c=await getAuthContext();requirePermission(c,'orders:update');await confirmMerchantCod(c.merchantId,c.userId,shipmentId);revalidatePath('/dashboard/orders');return {success:true as const};}catch(error){return failure(error);}}
