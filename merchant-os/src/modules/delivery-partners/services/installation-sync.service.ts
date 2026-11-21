import { createHmac } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { decryptSecret } from '@/lib/crypto/secret';
import { enqueueJob } from '@/services/jobs/outbox.service';
import { isQiadIntegration } from './partner-protocol';
import { validatePartnerEndpoint } from './partner-endpoint';
export async function setMerchantPartner(merchantId: string, partnerId: string, enabled: boolean) {
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${merchantId} FOR UPDATE`;
  const partner=await tx.deliveryPartner.findUnique({where:{id:partnerId},include:{providerConfig:true}});
  if(!partner || enabled&&(!partner.isActive||partner.status!=='ACTIVE'||partner.appStatus!=='PUBLISHED'))throw new BusinessRuleError('شركة الشحن غير متاحة.');
  const merchant=await tx.merchant.findUniqueOrThrow({where:{id:merchantId},select:{subscriptionMarket:true,currency:true}});
  if(enabled&&((partner.providerConfig?.market??'SD')!==merchant.subscriptionMarket || merchant.subscriptionMarket==='SA'&&merchant.currency!=='SAR'))throw new BusinessRuleError('شركة الشحن لا تطابق سوق وعملة المتجر.');
  const sync=isQiadIntegration(partner.providerConfig?.outboundWebhookUrl);
  const previous=await tx.merchantDeliveryPartner.findUnique({where:{merchantId_partnerId:{merchantId,partnerId}}});
  if(!enabled&&!previous)throw new BusinessRuleError('الشركة غير مثبتة لهذا المتجر.');
  const version=(previous?.providerSyncVersion??0)+1;
  const data={isActive:enabled,scopes:['shipping.read_write'],revokedAt:enabled?null:new Date(),providerSyncVersion:version,providerSyncStatus:sync?'PENDING':'NOT_REQUIRED',providerSyncError:null};
  const row=await tx.merchantDeliveryPartner.upsert({where:{merchantId_partnerId:{merchantId,partnerId}},create:{merchantId,partnerId,...data},update:data});
  if(sync)await enqueueJob({topic:'delivery.partner.installation.sync',payload:{installationId:row.id,version},idempotencyKey:'installation:'+row.id+':'+version,maxAttempts:8},tx);
  return row;
 });
}
export async function syncMerchantInstallation(installationId: string, version: number, finalAttempt=false) {
 const row=await prisma.merchantDeliveryPartner.findUniqueOrThrow({where:{id:installationId},include:{merchant:{include:{branches:{where:{isMain:true,isActive:true},take:1}}},partner:{include:{providerConfig:true}}}});
 if(row.providerSyncVersion!==version)return {skipped:true};
 const config=row.partner.providerConfig,active=row.isActive&&!row.revokedAt;
 try{
  if(active&&(!row.partner.isActive||row.partner.status!=='ACTIVE')||!config||active&&!config.isActive||config.integrationMode!=='APP_V1'||!config.clientId||!config.webhookSigningSecret||!isQiadIntegration(config.outboundWebhookUrl))throw new BusinessRuleError('تكامل الشركة غير جاهز للتسجيل.');
  if(active&&(config.market!==row.merchant.subscriptionMarket || config.market==='SA'&&row.merchant.currency!=='SAR'))throw new BusinessRuleError('شركة الشحن لا تطابق سوق المتجر.');
  const endpoint=new URL(config.outboundWebhookUrl!);endpoint.pathname='/api/method/qiad_logistics.wassla_webhooks.sync_installation';endpoint.search='';validatePartnerEndpoint(endpoint.toString(),config.approvedOrigin);
  const id='installation_'+row.id+'_'+version,branch=row.merchant.branches[0];
  const event={id,type:'installation.updated',occurredAt:new Date().toISOString(),partner:{id:row.partnerId,clientId:config.clientId},installation:{id:row.id,merchantId:row.merchantId,revision:version,active:!!active},store:{id:row.merchantId,name:row.merchant.name,...(active?{phone:branch?.phone||row.merchant.phone,address:branch?.address||row.merchant.address}:{})}};
  const raw=JSON.stringify(event);const response=await fetch(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/json','x-wasla-client-id':config.clientId,'x-wasla-event':event.type,'x-wasla-event-id':id,'idempotency-key':id,'x-wasla-signature':'sha256='+createHmac('sha256',decryptSecret(config.webhookSigningSecret)).update(raw).digest('hex')},body:raw});
  if(!response.ok)throw new BusinessRuleError('تعذر تسجيل المتجر لدى الشركة ('+response.status+').');
  const rawResult=await response.json();const result=rawResult.message??rawResult;
  if(result.ok!==true||result.revision!==version||result.active!==!!active)throw new BusinessRuleError('لم تؤكد الشركة حالة التثبيت المطلوبة.');
  await prisma.merchantDeliveryPartner.updateMany({where:{id:row.id,providerSyncVersion:version},data:{providerSyncStatus:active?'READY':'DISABLED',providerSyncError:null,providerSyncedAt:new Date()}});
  return {synced:true};
 }catch(error){
  await prisma.merchantDeliveryPartner.updateMany({where:{id:row.id,providerSyncVersion:version},data:{providerSyncStatus:finalAttempt?'FAILED':'PENDING',providerSyncError:'تعذر إكمال ربط الشركة. ستعاد المحاولة؛ راجع الإعدادات إذا استمر الخطأ.'}});
  throw error instanceof BusinessRuleError?error:new BusinessRuleError('تعذر اتصال تسجيل المتجر بشركة الشحن.');
 }
}
export async function enqueuePendingInstallations(partnerId?:string) {
 const rows=await prisma.merchantDeliveryPartner.findMany({where:{providerSyncStatus:'PENDING',...(partnerId?{partnerId}:{})},select:{id:true,providerSyncVersion:true}});
 for(const row of rows)await enqueueJob({topic:'delivery.partner.installation.sync',payload:{installationId:row.id,version:row.providerSyncVersion},idempotencyKey:'installation:'+row.id+':'+row.providerSyncVersion,maxAttempts:8});
 return rows.length;
}
