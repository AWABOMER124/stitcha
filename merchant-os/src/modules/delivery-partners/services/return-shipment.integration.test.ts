import { beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID, createHmac } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { encryptSecret } from '@/lib/crypto/secret';
import { saveRegionalPrice } from './regional-pricing.service';
import { quotePlatformDelivery, acceptDeliveryQuote } from './delivery-operations.service';
import { placeOrder } from '@/modules/storefront/services/storefront.service';
import { placeOrderSchema } from '@/modules/storefront/schemas/storefront.schemas';
import { merchantWaybill, partnerWaybill } from './partner-waybill.service';
import { createReturnShipment, dispatchReturnShipment, applyReturnShipmentState } from './return-shipment.service';
if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Requires isolated database');
const suffix=randomUUID().slice(0,8), secret='synthetic-return-secret';
let merchantId:string, orderId:string, partnerId:string, shipmentId:string, returnId:string;
const address={ customerName:'متجر الرجيع',customerPhone:'+249900000002',customerState:'الخرطوم',customerCity:'أم درمان',customerDistrict:'حي اختبار',customerAddress:'شارع المتجر، مبنى 2',customerAddressDescription:'بجوار المعلم',reason:'استرجاع كامل بطلب العميل' };
beforeAll(async()=>{
 process.env.SECRETS_ENCRYPTION_KEY='synthetic-return-encryption';
 const m=await prisma.merchant.create({data:{name:'متجر رجيع تجريبي',slug:`return-${suffix}`,businessType:'RETAIL',status:'ACTIVE',branches:{create:{name:'فرع',isMain:true,phone:'+249900000003',address:'عنوان تجريبي'}}}}); merchantId=m.id;
 const category=await prisma.category.create({data:{merchantId,name:'فئة',slug:`return-${suffix}`}});
 const product=await prisma.product.create({data:{merchantId,categoryId:category.id,name:'صنف تجريبي',slug:`return-${suffix}`,price:100}});
 partnerId=(await prisma.deliveryPartner.create({data:{name:'شركة رجيع تجريبية',slug:`return-${suffix}`,status:'ACTIVE',appStatus:'PUBLISHED',supportsCod:true,providerConfig:{create:{providerKey:'PARTNER_HTTP_V1',integrationMode:'APP_V1',clientId:`return-${suffix}`,clientSecretHash:'synthetic',outboundWebhookUrl:'https://return-test.example/api/method/qiad_logistics.wassla_webhooks.receive',approvedOrigin:'https://return-test.example',webhookSigningSecret:encryptSecret(secret),isActive:true}},merchantConnections:{create:{merchantId,providerSyncStatus:'READY',scopes:['shipping.read_write'],isActive:true}}}})).id;
 await saveRegionalPrice(partnerId,{stateId:'khartoum',cityId:'all',districtId:'all',baseFee:'100'});
 orderId=(await placeOrder(m.slug,placeOrderSchema.parse({customerName:'عميل تجريبي',customerPhone:'+249900000001',customerState:'الخرطوم',customerCity:'الخرطوم',customerDistrict:'حي العميل',customerAddress:'شارع العميل',customerAddressDescription:'معلم العميل',deliveryAddressVersion:'3',deliveryMethod:'MERCHANT_DELIVERY',paymentMethod:'CASH',items:[{productId:product.id,quantity:2}]}))).orderId;
 await prisma.order.update({where:{id:orderId},data:{status:'READY'}});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({providerReference:'SYNTHETIC-FORWARD'})));
 const quotes=await quotePlatformDelivery(orderId);const q=quotes.find(x=>x.partnerId===partnerId)!;await acceptDeliveryQuote(orderId,q.id);
 shipmentId=(await prisma.platformShipment.findUniqueOrThrow({where:{orderId}})).id;
});
describe('post-delivery full returns',()=>{
 it('rejects another merchant and a shipment not yet delivered',async()=>{
  await expect(createReturnShipment('other-merchant',orderId,address)).rejects.toThrow('غير موجودة');
  await expect(createReturnShipment(merchantId,orderId,address)).rejects.toThrow('بعد تسليم');
 });
 it('requires an explicit complete return destination',async()=>{
  await expect(createReturnShipment(merchantId,orderId,{...address,customerState:undefined})).rejects.toThrow('الولاية');
 });
 it('creates one durable return under concurrent retries without changing the delivered order',async()=>{
  // Synthetic fixtures only; never mark a real order delivered to test returns.
  await prisma.order.update({where:{id:orderId},data:{status:'DELIVERED'}});
  await prisma.platformShipment.update({where:{id:shipmentId},data:{status:'DELIVERED'}});
  const rows=await Promise.all([createReturnShipment(merchantId,orderId,address),createReturnShipment(merchantId,orderId,address)]);returnId=rows[0].id;
  expect(rows[1].id).toBe(returnId);expect(rows[0].pickup).toMatchObject({city:'الخرطوم',district:'حي العميل',address:'شارع العميل',addressDescription:'معلم العميل'});expect(rows[0].destination).toMatchObject({city:'أم درمان',district:'حي اختبار',address:'شارع المتجر، مبنى 2'});
  expect(await prisma.outboxJob.count({where:{idempotencyKey:`delivery:return:${returnId}`}})).toBe(1);
 });
 it('dispatches reverse addresses, full quantities, zero COD and a stable signed identity',async()=>{
  const fetcher=vi.fn().mockImplementation(async () => Response.json({ok:true,queued:true}));vi.stubGlobal('fetch',fetcher);
  await dispatchReturnShipment(returnId);await dispatchReturnShipment(returnId);
  const first=fetcher.mock.calls[0][1],second=fetcher.mock.calls[1][1],body=JSON.parse(first.body);
  expect(second.body).toBe(first.body);expect(body.shipment).toMatchObject({id:returnId,kind:'RETURN',parentShipmentId:shipmentId,parentProviderReference:'SYNTHETIC-FORWARD'});
  expect(body.sender.city).toBe('الخرطوم');expect(body.recipient.city).toBe('أم درمان');expect(body.payment.codAmount).toBe(0);expect(body.packages[0].items[0].quantity).toBe(2);
  expect(first.headers['x-wasla-signature']).toBe('sha256='+createHmac('sha256',secret).update(first.body).digest('hex'));
 });
 it('isolates return callbacks and rejects another partner without refunding the original',async()=>{
  const before=await prisma.order.findUniqueOrThrow({where:{id:orderId},include:{payment:true}});
  await expect(applyReturnShipmentState('other-partner',returnId,{eventId:'wrong-event',status:'REQUESTED'})).rejects.toThrow('not found');
  await applyReturnShipmentState(partnerId,returnId,{eventId:'return-created',status:'REQUESTED',providerReference:'SYNTHETIC-RETURN'});
  await applyReturnShipmentState(partnerId,returnId,{eventId:'return-delivered',status:'DELIVERED'});
  expect(await applyReturnShipmentState(partnerId,returnId,{eventId:'return-delivered',status:'DELIVERED'})).toMatchObject({applied:false,reason:'duplicate_event'});
  expect(await applyReturnShipmentState(partnerId,returnId,{eventId:'late-event',status:'ASSIGNED'})).toMatchObject({applied:false,reason:'outdated'});
  await expect(applyReturnShipmentState(partnerId,returnId,{eventId:'reference-change',status:'DELIVERED',providerReference:'WRONG'})).rejects.toThrow('cannot change');
  expect(await prisma.order.findUniqueOrThrow({where:{id:orderId},include:{payment:true}})).toEqual(before);
  expect((await prisma.platformShipment.findUniqueOrThrow({where:{id:shipmentId}})).status).toBe('DELIVERED');
 });
});

describe('signed white-label PDF access',()=>{
 it('keeps both merchant and partner access scoped before contacting the carrier',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(merchantWaybill('another-merchant',orderId)).rejects.toThrow('غير موجودة');
  await expect(partnerWaybill('another-partner',shipmentId)).rejects.toThrow('غير موجودة');
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('requests the original or return PDF using the correct installation and a server-only signature',async()=>{
  const fetcher=vi.fn().mockImplementation(async()=>new Response('%PDF-1.7\nsynthetic',{headers:{'content-type':'application/pdf'}}));vi.stubGlobal('fetch',fetcher);
  const pdf=await merchantWaybill(merchantId,orderId,true);expect(new TextDecoder().decode(pdf.bytes)).toContain('%PDF-1.7');expect(pdf.filename).toContain('WSLR-');
  const [url,options]=fetcher.mock.calls[0];expect(new URL(String(url)).pathname).toBe('/api/method/qiad_logistics.wassla_webhooks.download_waybill');const body=JSON.parse(options.body);
  expect(body.shipment).toMatchObject({id:returnId,providerReference:'SYNTHETIC-RETURN'});expect(body.store.id).toBe(merchantId);expect(body.type).toBe('shipment.label.requested');
  expect(options.headers['x-wasla-signature']).toBe('sha256='+createHmac('sha256',secret).update(options.body).digest('hex'));
  await partnerWaybill(partnerId,shipmentId);expect(JSON.parse(fetcher.mock.calls[1][1].body).shipment.id).toBe(shipmentId);
 });
 it('blocks a revoked installation and refuses non-PDF provider responses',async()=>{
  const conn=await prisma.merchantDeliveryPartner.findUniqueOrThrow({where:{merchantId_partnerId:{merchantId,partnerId}}});
  await prisma.merchantDeliveryPartner.update({where:{id:conn.id},data:{isActive:false}});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  try{await expect(merchantWaybill(merchantId,orderId)).rejects.toThrow('غير فعال');expect(fetcher).not.toHaveBeenCalled();}finally{await prisma.merchantDeliveryPartner.update({where:{id:conn.id},data:{isActive:true}});}
  fetcher.mockImplementation(async()=>new Response('<html>provider error</html>',{headers:{'content-type':'text/html'}}));await expect(merchantWaybill(merchantId,orderId)).rejects.toThrow('تعذر تحميل');
  fetcher.mockImplementation(async()=>new Response('not a PDF',{headers:{'content-type':'application/pdf'}}));await expect(merchantWaybill(merchantId,orderId)).rejects.toThrow('غير صالح');
 });
});
