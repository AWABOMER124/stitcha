import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError, NotFoundError } from '@/lib/errors';
const receiptSchema=z.object({amount:z.coerce.number().finite().positive().max(99999999.99).refine(v=>Math.abs(v*100-Math.round(v*100))<0.00001,'المبلغ يقبل منزلتين عشريتين.'),currency:z.string().length(3),reference:z.string().trim().min(3).max(140)});
export async function recordPartnerCod(partnerId:string,actorId:string,shipmentId:string,kind:'COLLECTED'|'REMITTED',input:unknown){
 const data=receiptSchema.parse(input);z.enum(['COLLECTED','REMITTED']).parse(kind);
 return prisma.$transaction(async tx=>{
  const initial=await tx.platformShipment.findFirst({where:{id:shipmentId,partnerId}});if(!initial)throw new NotFoundError('الشحنة غير موجودة لهذه الشركة.');
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${initial.orderId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${partnerId} FOR SHARE`;
  const partner=await tx.deliveryPartner.findUniqueOrThrow({where:{id:partnerId}});if(!partner.isActive||partner.status!=='ACTIVE')throw new BusinessRuleError('شركة الشحن غير فعالة.');
  await tx.$queryRaw`SELECT id FROM platform_shipments WHERE id = ${shipmentId} FOR UPDATE`;
  const row=await tx.platformShipment.findUniqueOrThrow({where:{id:shipmentId},include:{order:true,codCollection:true}}),cod=row.codCollection;
  if(row.status!=='DELIVERED'||row.order.status!=='DELIVERED'||row.order.paymentMethod!=='CASH'||!cod)throw new BusinessRuleError('يسجل التحصيل لشحنة تم تسليمها فقط.');
  if(data.currency!==cod.currency||Math.round(data.amount*100)!==Math.round(Number(cod.expectedAmount)*100))throw new BusinessRuleError('المبلغ والعملة يجب أن يطابقا التحصيل المتوقع؛ راجع أي اختلاف قبل التسجيل.');
  const previous=await tx.codReceipt.findUnique({where:{shipmentId_kind:{shipmentId,kind}}});
  if(previous){if(Number(previous.amount)!==data.amount||previous.reference!==data.reference)throw new BusinessRuleError('سبق تسجيل هذه الحركة بمرجع مختلف.');return {duplicate:true};}
  if(kind==='COLLECTED'&&cod.status!=='PENDING')throw new BusinessRuleError('حالة التحصيل لا تسمح بتسجيل حركة جديدة.');
  if(kind==='REMITTED'&&cod.status!=='COLLECTED')throw new BusinessRuleError('سجّل التحصيل أولًا قبل التوريد.');
  await tx.codReceipt.create({data:{shipmentId,kind,amount:data.amount,currency:data.currency,actorId,reference:data.reference}});
  await tx.codCollection.update({where:{id:cod.id},data:kind==='COLLECTED'?{status:'COLLECTED',collectedAmount:data.amount,collectedAt:new Date()}:{status:'REMITTED',remittedAmount:data.amount,remittedAt:new Date()}});
  return {duplicate:false};
 });
}
export async function confirmMerchantCod(merchantId:string,actorId:string,shipmentId:string){
 return prisma.$transaction(async tx=>{
  const initial=await tx.platformShipment.findFirst({where:{id:shipmentId,order:{merchantId}}});if(!initial)throw new NotFoundError('الشحنة غير موجودة لهذا المتجر.');
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${initial.orderId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM platform_shipments WHERE id = ${shipmentId} FOR UPDATE`;
  const cod=await tx.codCollection.findUnique({where:{shipmentId}});
  if(!cod||cod.status!=='REMITTED'||Number(cod.remittedAmount)!==Number(cod.expectedAmount))throw new BusinessRuleError('لا يوجد توريد مكتمل لتأكيد استلامه.');
  if(cod.merchantConfirmedAt)return {duplicate:true};
  const order=await tx.order.findUniqueOrThrow({where:{id:initial.orderId},include:{payment:true}});
  if(order.paymentMethod!=='CASH'||Number(order.total)!==Number(cod.expectedAmount)||order.payment&&(!['PENDING','COMPLETED'].includes(order.payment.status)||order.payment.method!=='CASH'||order.payment.status==='COMPLETED'&&Number(order.payment.amount)!==Number(cod.expectedAmount)))throw new BusinessRuleError('بيانات الدفع تحتاج مراجعة قبل تأكيد الاستلام.');
  if(!order.payment||order.payment.status==='PENDING'){
   const receipt=await tx.codReceipt.findUniqueOrThrow({where:{shipmentId_kind:{shipmentId,kind:'REMITTED'}}});
   await tx.payment.upsert({where:{orderId:order.id},create:{orderId:order.id,method:'CASH',status:'COMPLETED',amount:cod.expectedAmount,paidAt:cod.collectedAt??new Date(),transactionRef:receipt.reference},update:{status:'COMPLETED',amount:cod.expectedAmount,paidAt:cod.collectedAt??new Date(),transactionRef:receipt.reference}});
  }
  await tx.codReceipt.create({data:{shipmentId,kind:'CONFIRMED',amount:cod.expectedAmount,currency:cod.currency,actorId,reference:'merchant-receipt-confirmation'}});
  await tx.codCollection.update({where:{id:cod.id},data:{merchantConfirmedAt:new Date(),merchantConfirmedBy:actorId}});return {duplicate:false};
 });
}
