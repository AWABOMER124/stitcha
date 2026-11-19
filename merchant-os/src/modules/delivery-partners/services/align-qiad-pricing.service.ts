import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { isQiadIntegration } from './partner-protocol';
import { QIAD_CITIES } from './provider-coverage';
export async function alignQiadPricing(partnerId:string){
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id=${partnerId} FOR UPDATE`;
  const config=await tx.deliveryPartnerProviderConfig.findUnique({where:{partnerId}});if(!isQiadIntegration(config?.outboundWebhookUrl))throw new BusinessRuleError('This operation is limited to the QIAD connector');
  const rules=await tx.deliveryPartnerPricingRule.findMany({where:{partnerId,isActive:true,perKmFee:0,maxDistanceKm:null,serviceArea:{state:'الخرطوم',allCities:true,isActive:true}},include:{serviceArea:true}});
  let created=0;
  for(const rule of rules){for(const city of QIAD_CITIES){
   const existing=await tx.deliveryPartnerPricingRule.findFirst({where:{partnerId,isActive:true,serviceArea:{state:'الخرطوم',city,allCities:false,allDistricts:true,isActive:true}}});if(existing)continue;
   const area=await tx.deliveryPartnerServiceArea.create({data:{partnerId,code:'QIAD-'+randomUUID().slice(0,12),name:'الخرطوم · '+city+' · كل الأحياء',state:'الخرطوم',city,allCities:false,allDistricts:true,estimatedMinutesMin:rule.serviceArea?.estimatedMinutesMin,estimatedMinutesMax:rule.serviceArea?.estimatedMinutesMax,description:'تغطية قياد الفعلية — العاصمة المثلثة'}});
   await tx.deliveryPartnerPricingRule.create({data:{partnerId,serviceAreaId:area.id,baseFee:rule.baseFee,perKmFee:0,minimumFee:rule.minimumFee,maximumFee:rule.maximumFee,maxDistanceKm:null,currency:rule.currency,priority:rule.priority}});created++;
  }
  await tx.deliveryPartnerPricingRule.update({where:{id:rule.id},data:{isActive:false}});
  await tx.deliveryQuote.updateMany({where:{pricingRuleId:rule.id,status:'OFFERED'},data:{status:'CANCELLED'}});
  if(rule.serviceAreaId)await tx.deliveryPartnerServiceArea.updateMany({where:{id:rule.serviceAreaId,pricingRules:{none:{isActive:true}}},data:{isActive:false}});
  }
  return {retiredBroadRules:rules.length,createdCityRules:created};
 });
}
