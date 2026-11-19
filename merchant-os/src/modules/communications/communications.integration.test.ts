import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { filtersSchema, type MessageInput } from './contracts';
import { cancelCampaign, enqueueAutomations, ensureCatalog, launchCampaign, previewMessage, saveDraft } from './service';
import { resolveRecipients } from './recipients';
import { mergedMerchantNotifications, mergedMerchantUnreadCount, markMergedMerchantRead } from './merchant-inbox';
import { communicationJobHandlers } from './delivery';
import { processOutboxBatch } from '@/services/jobs/outbox.service';

import { getPersonalMessagesAction, saveCommunicationPreferenceAction } from './actions';
vi.mock('@/lib/auth/config',()=>({auth:async()=>({user:{id:merchantUser}})}));

vi.mock('@/services/notifications/providers/email.provider', () => ({ EmailProvider: class { async send() {} } }));
vi.mock('@/services/notifications/providers/whatsapp.provider', () => ({ WhatsAppProvider: class { async send() {} } }));

if (!process.env.DATABASE_URL?.includes('/wasla_comms_test')) throw new Error('Communication integration tests require the isolated wasla_comms_test database');
const suffix = randomUUID().slice(0, 8), actor = `communication-test-${suffix}`;
let merchantUser: string, merchantId: string, otherUser: string, otherMerchantId: string, marketerUser: string, partnerUser: string;
function message(extra: Partial<MessageInput> = {}): MessageInput {
  return { name: 'اختبار حملة', audience: 'MERCHANT', purpose: 'SERVICE', filters: filtersSchema.parse({ userIds: [merchantUser] }), channels: ['IN_APP'], title: 'أهلًا {{name}}', body: 'هذه رسالة اختبار إلى {{business_name}}. {{action_url}}', actionPath: '/dashboard', scheduledAt: null, ...extra };
}
async function queuedCampaign(input: MessageInput) {
  const d = await saveDraft(input, actor), p = await previewMessage(input, actor);
  await launchCampaign(d.id, p.token, actor); return d;
}
async function work(now = new Date()) { return processOutboxBatch({ workerId: actor, handlers: communicationJobHandlers, now, batchSize: 100 }); }

beforeAll(async () => {
  const old = new Date(Date.now() - 10 * 86400000);
  for (let index = 0; index < 2; index++) {
    const u = await prisma.user.create({ data: { email: `communication-${suffix}-${index}@wasla.invalid`, name: `تاجر اختبار ${index}`, role: 'MERCHANT_OWNER', createdAt: old } });
    const m = await prisma.merchant.create({ data: { name: `متجر الاختبار ${index}`, slug: `communication-${suffix}-${index}`, businessType: 'RETAIL', status: 'PENDING', createdAt: old,
      users: { create: { userId: u.id, role: 'MERCHANT_OWNER', isOwner: true, isActive: true } } } });
    if (index === 0) { merchantUser = u.id; merchantId = m.id; } else { otherUser = u.id; otherMerchantId = m.id; }
  }
  const marketer = await prisma.user.create({ data: { email: `communication-${suffix}-marketer@wasla.invalid`, role: 'MARKETER', createdAt: old,
    marketerAccount: { create: { acquisitionCode: `TEST-${suffix}` } } } });
  marketerUser = marketer.id;
  const partner = await prisma.user.create({ data: { email: `communication-${suffix}-partner@wasla.invalid`, role: 'DELIVERY_PARTNER_OWNER', createdAt: old } });
  const company = await prisma.deliveryPartner.create({ data: { name: 'شركة اختبار الرسائل', slug: `communication-${suffix}`, status: 'PENDING' } });
  await prisma.deliveryPartnerUser.create({ data: { userId: partner.id, partnerId: company.id, role: 'DELIVERY_PARTNER_OWNER', isOwner: true, isActive: true } });
  partnerUser = partner.id;
  await ensureCatalog();
}, 30000);
beforeEach(async () => {
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'PENDING' } });
  await prisma.communicationPreference.deleteMany({ where: { userId: merchantUser } });
  await prisma.communicationRule.updateMany({ data: { isActive: false } });
});

describe('Communication center against PostgreSQL', () => {
  it('seeds templates idempotently with all automatic rules disabled', async () => {
    const before = await prisma.communicationTemplate.count(); await ensureCatalog();
    expect(await prisma.communicationTemplate.count()).toBe(before);
    expect(await prisma.communicationRule.count({ where: { isActive: true } })).toBe(0);
  });
  it('keeps each role and chosen individual inside the selected audience', async () => {
    expect(await resolveRecipients('MERCHANT', filtersSchema.parse({ userIds: [marketerUser, partnerUser] }))).toHaveLength(0);
    expect((await resolveRecipients('MARKETER', filtersSchema.parse({ userIds: [marketerUser] })))[0]?.id).toBe(marketerUser);
    expect((await resolveRecipients('PARTNER', filtersSchema.parse({ userIds: [partnerUser], segment: 'PARTNER_UNPUBLISHED' })))[0]?.id).toBe(partnerUser);
  });
  it('does not launch after the recipient condition changed following preview', async () => {
    const input = message({ filters: filtersSchema.parse({ userIds: [merchantUser], segment: 'NOT_ACTIVATED' }) });
    const campaign = await saveDraft(input, actor), p = await previewMessage(input, actor);
    await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } });
    await expect(launchCampaign(campaign.id, p.token, actor)).rejects.toThrow('تغيرت');
    expect(await prisma.communicationDelivery.count({ where: { campaignId: campaign.id } })).toBe(0);
  });
  it('atomically launches once even when the confirm button is submitted concurrently', async () => {
    const input = message(), campaign = await saveDraft(input, actor), p = await previewMessage(input, actor);
    const results = await Promise.allSettled([launchCampaign(campaign.id, p.token, actor), launchCampaign(campaign.id, p.token, actor)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.communicationDelivery.count({ where: { campaignId: campaign.id } })).toBe(1);
  });
  it('delivers into the correct merchant inbox and prevents cross-user reads', async () => {
    const campaign = await queuedCampaign(message()); await work();
    const deliveries = await prisma.communicationDelivery.findMany({ where: { campaignId: campaign.id } });
    expect(deliveries[0].status).toBe('DELIVERED');
    const detail=await getPersonalMessagesAction(deliveries[0].id);expect(detail.success).toBe(true);if(detail.success)expect(detail.data.rows.map(r=>r.id)).toEqual([deliveries[0].id]);
    const otherDelivery=await prisma.communicationDelivery.findFirst({where:{userId:otherUser}});if(otherDelivery){const hidden=await getPersonalMessagesAction(otherDelivery.id);expect(hidden.success&&hidden.data.rows.length).toBe(0);}
    const mine = await mergedMerchantNotifications(merchantId, merchantUser, {});
    expect(mine.data.some(n => n.id === `message_${deliveries[0].id}`)).toBe(true);
    expect((await mergedMerchantNotifications(otherMerchantId, otherUser, {})).data.some(n => n.id === `message_${deliveries[0].id}`)).toBe(false);
    await markMergedMerchantRead(otherMerchantId, otherUser, [`message_${deliveries[0].id}`]);
    expect((await prisma.communicationDelivery.findUniqueOrThrow({ where: { id: deliveries[0].id } })).readAt).toBeNull();
    await markMergedMerchantRead(merchantId, merchantUser, [`message_${deliveries[0].id}`]);
    expect((await prisma.communicationDelivery.findUniqueOrThrow({ where: { id: deliveries[0].id } })).readAt).not.toBeNull();
  });
  it('skips a queued reminder once the merchant activates', async () => {
    const campaign = await queuedCampaign(message({ filters: filtersSchema.parse({ userIds: [merchantUser], segment: 'NOT_ACTIVATED' }) }));
    await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } }); await work();
    expect((await prisma.communicationDelivery.findFirstOrThrow({ where: { campaignId: campaign.id } })).status).toBe('SKIPPED');
  });
  it('honors campaign cancellation and scheduled delivery times', async () => {
    const cancelled = await queuedCampaign(message()); await cancelCampaign(cancelled.id); await work();
    expect((await prisma.communicationDelivery.findFirstOrThrow({ where: { campaignId: cancelled.id } })).status).toBe('CANCELLED');
    const scheduled = await queuedCampaign(message({ scheduledAt: new Date(Date.now() + 3600000).toISOString() })); await work();
    expect((await prisma.communicationDelivery.findFirstOrThrow({ where: { campaignId: scheduled.id } })).status).toBe('QUEUED');
  });
  it('counts marketing opt-outs and refuses a campaign with no eligible channel', async () => {
    await prisma.communicationPreference.create({ data: { userId: merchantUser, marketing: false } });
    const input = message({ purpose: 'MARKETING' }), campaign = await saveDraft(input, actor), p = await previewMessage(input, actor);
    expect(p.total).toBe(1); expect(p.totalDeliveries).toBe(0);
    await expect(launchCampaign(campaign.id, p.token, actor)).rejects.toThrow('لا يوجد');
  });
  it('enrolls a matching account only once per rule and channel', async () => {
    const template = await prisma.communicationTemplate.findUniqueOrThrow({ where: { key: 'merchant-activation' } });
    const rule = await prisma.communicationRule.create({ data: { key: `test-${suffix}`, name: 'قاعدة اختبار', templateId: template.id,
      filters: filtersSchema.parse({ userIds: [merchantUser], segment: 'NOT_ACTIVATED', minAgeDays: 1 }), channels: ['IN_APP'], isActive: true } });
    expect(await enqueueAutomations()).toBe(1);
    expect(await enqueueAutomations(new Date(Date.now() + 7200000))).toBe(0);
    expect(await prisma.communicationDelivery.count({ where: { dedupeKey: `rule:${rule.id}:${merchantUser}:IN_APP` } })).toBe(1);
    await prisma.communicationRule.update({ where: { id: rule.id }, data: { isActive: false } }); await work();
    expect((await prisma.communicationDelivery.findUniqueOrThrow({ where: { dedupeKey: `rule:${rule.id}:${merchantUser}:IN_APP` } })).status).toBe('SKIPPED');
  });
});

 describe('message settings and exact notification targets',()=>{
 it('persists personal campaign preferences independently of other accounts',async()=>{
  const saved=await saveCommunicationPreferenceAction({marketing:false,email:false,whatsapp:true});expect(saved.success).toBe(true);
  const loaded=await getPersonalMessagesAction();expect(loaded.success).toBe(true);if(loaded.success)expect(loaded.data.preference).toEqual({marketing:false,email:false,whatsapp:true});
  expect(await prisma.communicationPreference.findUnique({where:{userId:otherUser}})).toBeNull();
 });
 it('resolves old alerts by id without exposing another merchant or external-channel logs',async()=>{
  const a=await prisma.notificationLog.create({data:{merchantId,type:'SYSTEM',channel:'IN_APP',recipient:merchantUser,title:'اختبار رابط محدد',body:'رسالة داخلية'}});
  const b=await prisma.notificationLog.create({data:{merchantId:otherMerchantId,type:'SYSTEM',channel:'IN_APP',recipient:otherUser,title:'حساب آخر',body:'خاص'}});
  const email=await prisma.notificationLog.create({data:{merchantId,type:'SYSTEM',channel:'EMAIL',recipient:'test@example.invalid',title:'سجل بريد',body:'ليس إشعارًا داخليًا'}});
  const own=await mergedMerchantNotifications(merchantId,merchantUser,{id:a.id});expect(own.data.map(x=>x.id)).toEqual([a.id]);
  expect((await mergedMerchantNotifications(merchantId,merchantUser,{id:b.id})).data).toHaveLength(0);
  expect((await mergedMerchantNotifications(merchantId,merchantUser,{id:email.id})).data).toHaveLength(0);
  const before=await mergedMerchantUnreadCount(merchantId,merchantUser);await markMergedMerchantRead(merchantId,merchantUser,[a.id,b.id,email.id]);expect(await mergedMerchantUnreadCount(merchantId,merchantUser)).toBe(before-1);
  expect((await prisma.notificationLog.findUniqueOrThrow({where:{id:b.id}})).isRead).toBe(false);expect((await prisma.notificationLog.findUniqueOrThrow({where:{id:email.id}})).isRead).toBe(false);
 });
 });
