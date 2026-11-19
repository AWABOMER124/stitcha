import prisma from '@/lib/db/prisma';
import { getAuthContext,requirePermission } from '@/lib/permissions';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { CodForm } from '@/components/partner/cod-form';
async function panel(shipmentId:string,scope:{partnerId:string}|{order:{merchantId:string}},merchant:boolean,canConfirm=true){
 const row=await prisma.platformShipment.findFirst({where:{id:shipmentId,...scope},include:{codCollection:true,codReceipts:{orderBy:{createdAt:'asc'}}}});if(!row?.codCollection)return null;const c=row.codCollection;
 const state=Number(c.expectedAmount)===0?'لا يوجد مبلغ للتحصيل':c.merchantConfirmedAt?'استلم المتجر المبلغ':c.status==='REMITTED'?'توريد مسجّل — بانتظار تأكيد المتجر':c.status==='COLLECTED'?'تم تسجيل التحصيل':c.status==='PENDING'?'بانتظار التحصيل':c.status;
 return <section dir="rtl" className="space-y-4 rounded-2xl border bg-white p-5 text-slate-900"><h2 className="font-black">التحصيل والتوريد</h2><p>{state}</p><p>المتوقع: {c.expectedAmount.toString()} {c.currency} · المحصّل: {c.collectedAmount?.toString()||'0'} · المورّد: {c.remittedAmount?.toString()||'0'}</p>{row.codReceipts.map(r=><p key={r.id} className="text-xs">{r.kind==='COLLECTED'?'إيصال التحصيل':r.kind==='REMITTED'?'إيصال التوريد':'تأكيد المتجر'}: {r.kind==='CONFIRMED'?'تم التأكيد':r.reference} · {r.createdAt.toISOString().slice(0,10)}</p>)}
 {!merchant&&Number(c.expectedAmount)>0&&row.status==='DELIVERED'&&['PENDING','COLLECTED'].includes(c.status)&&<CodForm shipmentId={row.id} kind={c.status==='PENDING'?'COLLECTED':'REMITTED'} amount={c.expectedAmount.toString()} currency={c.currency}/>}
 {merchant&&canConfirm&&c.status==='REMITTED'&&!c.merchantConfirmedAt&&<CodForm shipmentId={row.id} kind="CONFIRMED" amount={c.expectedAmount.toString()} currency={c.currency}/>}
 </section>;
}
export async function PartnerCodPanel({shipmentId}:{shipmentId:string}){const {partnerId}=await requireDeliveryPartner();return panel(shipmentId,{partnerId},false);}
export async function MerchantCodPanel({shipmentId}:{shipmentId:string}){const c=await getAuthContext();requirePermission(c,'orders:read');return panel(shipmentId,{order:{merchantId:c.merchantId}},true,c.role==='MERCHANT_OWNER'||c.permissions.includes('orders:update'));}
