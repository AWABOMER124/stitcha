import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/db/prisma';
import { enqueueJob } from '@/services/jobs/outbox.service';
import { templateCatalog } from './catalog';
import { assertMessageVariables, filtersSchema, messageSchema, renderMessage, type Audience, type MessageInput } from './contracts';
import { channelExclusion, resolveRecipients, type Recipient } from './recipients';
import { createPreviewToken, previewDigest, unsubscribeToken, verifyPreviewToken } from './security';

export const DELIVERY_TOPIC = 'communication.delivery';
export function publicOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://wassla-sd.shop');
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('عنوان المنصة غير صالح');
  return url.origin;
}
export function availableChannels() {
  return { IN_APP: true, EMAIL: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    WHATSAPP: Boolean(process.env.PLATFORM_WHATSAPP_PROVIDER === 'evolution' && process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE_NAME) };
}
function prepare(input: unknown) {
  const data = messageSchema.parse(input);
  assertMessageVariables(data.title); assertMessageVariables(data.body);
  const available = availableChannels();
  if (data.channels.some(c => !available[c])) throw new Error('إحدى قنوات الإرسال المختارة غير مهيأة');
  if (data.scheduledAt && (new Date(data.scheduledAt).getTime() < Date.now() + 60000 || new Date(data.scheduledAt).getTime() > Date.now() + 365 * 86400000)) throw new Error('اختر موعدًا بعد دقيقة على الأقل وخلال سنة. إذا اقترب الموعد أثناء المعاينة، عدّل الموعد أو امسحه للإرسال بعد التأكيد.');
  return data;
}
export function renderedFor(input: Pick<MessageInput, 'title' | 'body' | 'actionPath' | 'audience'>, recipient: Recipient) {
  const actionPath = input.actionPath || (input.audience === 'MERCHANT' ? '/dashboard' : input.audience === 'PARTNER' ? '/partner' : '/marketer');
  const values = { name: recipient.name, business_name: recipient.businessName, platform_name: 'وصلة', action_url: publicOrigin() + actionPath, store_url: publicOrigin() + recipient.storePath };
  const title = renderMessage(input.title, values), body = renderMessage(input.body, values);
  if (title.length > 300 || body.length > 5000) throw new Error('الرسالة بعد تخصيصها تتجاوز الطول المسموح');
  return { title, body, actionPath };
}
function eligibility(input: MessageInput, recipients: Recipient[]) {
  return recipients.flatMap(recipient => input.channels.map(channel => ({ recipient, channel, reason: channelExclusion(recipient, channel, input.purpose) })));
}
function digestKeys(rows: ReturnType<typeof eligibility>) {
  return rows.filter(x => !x.reason).map(({ recipient: r, channel }) => JSON.stringify([r.id, channel, r.entityId, r.name, r.businessName, r.storePath, channel === 'EMAIL' ? r.email : channel === 'WHATSAPP' ? r.phone : r.id]));
}
export async function previewMessage(input: unknown, actorId: string) {
  const data = prepare(input), recipients = await resolveRecipients(data.audience, data.filters), rows = eligibility(data, recipients);
  for (const r of recipients) {
    const rendered = renderedFor(data, r);
    if (data.channels.includes('WHATSAPP') && rendered.body.length + (data.purpose === 'MARKETING' ? unsubscribeUrl(r.id).length + 45 : 0) > 4000) throw new Error('اختصر نص واتساب إلى أقل من 4000 حرف بعد تخصيصه');
  }
  const counts = Object.fromEntries(data.channels.map(c => [c, { eligible: rows.filter(x => x.channel === c && !x.reason).length, excluded: rows.filter(x => x.channel === c && x.reason).length }]));
  return { input: data, total: recipients.length, totalDeliveries: rows.filter(x => !x.reason).length, counts,
    recipients: recipients.slice(0, 100).map(r => ({ id: r.id, name: r.name, businessName: r.businessName, email: r.email, phone: r.phone,
      exclusions: rows.filter(x => x.recipient.id === r.id && x.reason).map(x => ({ channel: x.channel, reason: x.reason })) })),
    sample: recipients[0] ? renderedFor(data, recipients[0]) : null,
    token: createPreviewToken(previewDigest(data, digestKeys(rows)), actorId) };
}

export async function ensureCatalog() {
  await prisma.communicationTemplate.createMany({ skipDuplicates: true, data: templateCatalog.map(t => ({ key: t.key, name: t.name, audience: t.audience, purpose: t.purpose, segment: t.segment, title: t.title, body: t.body, actionPath: t.actionPath, channels: t.channels })) });
  const templates = await prisma.communicationTemplate.findMany({ select: { id: true, key: true } });
  await prisma.communicationRule.createMany({ skipDuplicates: true, data: templateCatalog.filter(t => t.age).map(t => ({
    key: t.key, name: t.name, templateId: templates.find(x => x.key === t.key)!.id,
    filters: { segment: t.segment, minAgeDays: t.age!, maxAgeDays: null, search: '', userIds: [] }, channels: t.channels, isActive: false,
  })) });
}

export async function getCenterData() {
  await ensureCatalog();
  const [templates, rules, campaigns, stats, preferences] = await Promise.all([
    prisma.communicationTemplate.findMany({ orderBy: [{ audience: 'asc' }, { createdAt: 'asc' }] }),
    prisma.communicationRule.findMany({ include: { template: true }, orderBy: { createdAt: 'asc' } }),
    prisma.communicationCampaign.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { _count: { select: { deliveries: true } } } }),
    prisma.communicationDelivery.groupBy({ by: ['status'], _count: true }),
    prisma.communicationPreference.count({ where: { marketing: false } }),
  ]);
  const ids = campaigns.map(x => x.id);
  const progress = await prisma.communicationDelivery.groupBy({ by: ['campaignId', 'status'], where: { campaignId: { in: ids } }, _count: true });
  return { templates, rules, campaigns: campaigns.map(c => ({ ...c, progress: progress.filter(p => p.campaignId === c.id).map(p => ({ status: p.status, count: p._count })) })), stats, optOutCount: preferences, available: availableChannels() };
}

export async function saveDraft(input: unknown, actorId: string, id?: string) {
  const data = prepare(input), payload = { ...data, scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null, filters: data.filters as Prisma.InputJsonValue, channels: data.channels as Prisma.InputJsonValue };
  if (!id) return prisma.communicationCampaign.create({ data: { ...payload, createdById: actorId } });
  const result = await prisma.communicationCampaign.updateMany({ where: { id, status: 'DRAFT', ruleId: null }, data: payload });
  if (!result.count) throw new Error('لا يمكن تعديل حملة سبق إطلاقها');
  return prisma.communicationCampaign.findUniqueOrThrow({ where: { id } });
}

export function campaignInput(c: { name: string; audience: string; purpose: string; filters: Prisma.JsonValue; channels: Prisma.JsonValue; title: string; body: string; actionPath: string | null; scheduledAt: Date | null }) {
  return messageSchema.parse({ ...c, scheduledAt: c.scheduledAt?.toISOString() || null });
}

async function createDeliveries(tx: Prisma.TransactionClient, campaignId: string, input: MessageInput, recipients: Recipient[], ruleId?: string) {
  const data: Prisma.CommunicationDeliveryCreateManyInput[] = [];
  for (const { recipient, channel, reason } of eligibility(input, recipients)) {
    if (reason) continue;
    const rendered = renderedFor(input, recipient);
    const dedupeKey = ruleId ? `rule:${ruleId}:${recipient.id}:${channel}` : null;
    const address = channel === 'EMAIL' ? recipient.email : channel === 'WHATSAPP' ? recipient.phone! : recipient.id;
    data.push({ campaignId, userId: recipient.id, entityId: recipient.entityId, channel, recipient: address, ...rendered, dedupeKey });
  }
  if (!data.length) return 0;
  const deliveries = await tx.communicationDelivery.createManyAndReturn({ data, skipDuplicates: true, select: { id: true } });
  await tx.outboxJob.createMany({ data: deliveries.map(delivery => ({ topic: DELIVERY_TOPIC, payload: { deliveryId: delivery.id }, idempotencyKey: `communication:${delivery.id}:0`, maxAttempts: 5,
    availableAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date() })), skipDuplicates: true });
  return deliveries.length;
}

export async function launchCampaign(id: string, token: string, actorId: string) {
  const campaign = await prisma.communicationCampaign.findUniqueOrThrow({ where: { id } });
  const data = prepare(campaignInput(campaign)), recipients = await resolveRecipients(data.audience, data.filters), rows = eligibility(data, recipients);
  verifyPreviewToken(token, previewDigest(data, digestKeys(rows)), actorId);
  if (!rows.some(x => !x.reason)) throw new Error('لا يوجد مستلم مؤهل للقنوات المختارة');
  return prisma.$transaction(async tx => {
    const claimed = await tx.communicationCampaign.updateMany({ where: { id, status: 'DRAFT', ruleId: null }, data: { status: data.scheduledAt ? 'SCHEDULED' : 'QUEUED' } });
    if (!claimed.count) throw new Error('أُطلقت الحملة مسبقًا أو أُلغيت؛ لن يتكرر الإرسال');
    const count = await createDeliveries(tx, id, data, recipients);
    return { id, queued: count };
  }, { timeout: 60000 });
}

export async function cancelCampaign(id: string) {
  return prisma.$transaction(async tx => {
    const c = await tx.communicationCampaign.findUniqueOrThrow({ where: { id } });
    if (c.ruleId) throw new Error('أوقف القاعدة التلقائية من تبويب القواعد');
    if (!['DRAFT', 'SCHEDULED', 'QUEUED', 'RUNNING'].includes(c.status)) throw new Error('الحملة انتهت بالفعل');
    await tx.communicationCampaign.update({ where: { id }, data: { status: 'CANCELLED' } });
    return tx.communicationDelivery.updateMany({ where: { campaignId: id, status: { in: ['QUEUED', 'RETRYING'] } }, data: { status: 'CANCELLED', lastError: 'ألغيت الحملة قبل الإرسال' } });
  });
}

export async function retryCampaignFailures(id: string) {
  return prisma.$transaction(async tx => {
    const c = await tx.communicationCampaign.findUniqueOrThrow({ where: { id } });
    if (c.status === 'CANCELLED') throw new Error('الحملة ملغاة');
    const rows = await tx.communicationDelivery.findMany({ where: { campaignId: id, status: 'FAILED' }, take: 2000 });
    let count = 0;
    for (const d of rows) {
      const updated = await tx.communicationDelivery.updateMany({ where: { id: d.id, status: 'FAILED', retryCount: d.retryCount }, data: { status: 'QUEUED', lastError: null, startedAt: null, retryCount: { increment: 1 } } });
      if (!updated.count) continue;
      await enqueueJob({ topic: DELIVERY_TOPIC, payload: { deliveryId: d.id }, idempotencyKey: `communication:${d.id}:${d.retryCount + 1}`, maxAttempts: 5 }, tx);
      count++;
    }
    if (count) await tx.communicationCampaign.update({ where: { id }, data: { status: 'QUEUED' } });
    return { count };
  });
}

export async function campaignDetails(id: string) {
  const [campaign, deliveries] = await Promise.all([
    prisma.communicationCampaign.findUniqueOrThrow({ where: { id } }),
    prisma.communicationDelivery.findMany({ where: { campaignId: id }, take: 200, orderBy: { createdAt: 'asc' }, select: {
      id: true, channel: true, status: true, lastError: true, acceptedAt: true, readAt: true, retryCount: true,
      user: { select: { name: true, email: true } },
    } }),
  ]);
  return { campaign, deliveries };
}

export async function saveTemplate(id: string, input: unknown) {
  const data = prepare(input);
  return prisma.$transaction(async tx => {
    const previous = await tx.communicationTemplate.findUniqueOrThrow({ where: { id } });
    if (previous.audience !== data.audience) throw new Error('احفظ قالبًا جديدًا لتغيير الجمهور');
    const t = await tx.communicationTemplate.update({ where: { id }, data: { name: data.name, audience: data.audience, purpose: data.purpose, segment: data.filters.segment, title: data.title, body: data.body, actionPath: data.actionPath, channels: data.channels } });
    await tx.communicationRule.updateMany({ where: { templateId: id }, data: { isActive: false } });
    return t;
  });
}

export async function createTemplate(input: unknown) {
  const data = prepare(input);
  return prisma.communicationTemplate.create({ data: { key: `custom-${randomUUID()}`, name: data.name, audience: data.audience, purpose: data.purpose,
    segment: data.filters.segment, title: data.title, body: data.body, actionPath: data.actionPath, channels: data.channels } });
}
export async function createRuleFromTemplate(id: string) {
  const t = await prisma.communicationTemplate.findUniqueOrThrow({ where: { id } });
  const existing = await prisma.communicationRule.findFirst({ where: { templateId: id }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.communicationRule.upsert({ where: { key: `template-${id}` }, update: {}, create: {
    key: `template-${id}`, name: t.name, templateId: id, channels: t.channels as Prisma.InputJsonValue,
    filters: { segment: t.segment, minAgeDays: 1, maxAgeDays: null, userIds: [], search: '' }, isActive: false,
  } });
}
export async function updateRuleFilters(id: string, input: unknown) {
  const value = messageSchema.pick({ filters: true, channels: true, name: true }).parse(input);
  return prisma.communicationRule.update({ where: { id }, data: { name: value.name, filters: value.filters as Prisma.InputJsonValue, channels: value.channels, isActive: false } });
}

export function ruleInput(rule: { name: string; filters: Prisma.JsonValue; channels: Prisma.JsonValue; template: { audience: string; purpose: string; title: string; body: string; actionPath: string | null } }): MessageInput {
  return messageSchema.parse({ ...rule.template, name: rule.name, filters: rule.filters, channels: rule.channels, scheduledAt: null });
}
export async function activateRule(id: string, token: string, actorId: string) {
  const rule = await prisma.communicationRule.findUniqueOrThrow({ where: { id }, include: { template: true } });
  const data = prepare(ruleInput(rule)), recipients = await resolveRecipients(data.audience, data.filters);
  verifyPreviewToken(token, previewDigest(data, digestKeys(eligibility(data, recipients))), actorId);
  return prisma.communicationRule.update({ where: { id }, data: { isActive: true, lastEvaluatedAt: null, lastError: null } });
}
export async function pauseRule(id: string) {
  await prisma.communicationRule.update({ where: { id }, data: { isActive: false } });
}

export async function enqueueAutomations(now = new Date()) {
  const rules = await prisma.communicationRule.findMany({ where: { isActive: true, OR: [{ lastEvaluatedAt: null }, { lastEvaluatedAt: { lt: new Date(now.getTime() - 3600000) } }] }, include: { template: true }, take: 20 });
  let queued = 0;
  for (const rule of rules) {
    try {
    const data = prepare(ruleInput(rule)), recipients = await resolveRecipients(data.audience, data.filters, now);
    queued += await prisma.$transaction(async tx => {
      const claimed = await tx.communicationRule.updateMany({ where: { id: rule.id, isActive: true, OR: [{ lastEvaluatedAt: null }, { lastEvaluatedAt: { lt: new Date(now.getTime() - 3600000) } }] }, data: { lastEvaluatedAt: now, lastError: null } });
      if (!claimed.count) return 0;
      const already = await tx.communicationDelivery.findMany({ where: { dedupeKey: { startsWith: `rule:${rule.id}:` } }, select: { dedupeKey: true } });
      const seen = new Set(already.map(x => x.dedupeKey));
      const fresh = recipients.filter(r => data.channels.some(c => !channelExclusion(r, c, data.purpose) && !seen.has(`rule:${rule.id}:${r.id}:${c}`)));
      if (!fresh.length) return 0;
      const campaign = await tx.communicationCampaign.create({ data: { name: rule.name, audience: data.audience, purpose: data.purpose, filters: data.filters as Prisma.InputJsonValue, channels: data.channels,
        title: data.title, body: data.body, actionPath: data.actionPath, createdById: 'AUTOMATION', ruleId: rule.id, status: 'QUEUED' } });
      return createDeliveries(tx, campaign.id, data, fresh, rule.id);
    }, { timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch {
      // A malformed campaign/rule must not block order, shipping or billing jobs.
      await prisma.communicationRule.updateMany({ where: { id: rule.id }, data: { lastEvaluatedAt: now, lastError: 'تعذر تجهيز الجمهور. راجع شروط القاعدة وحجم الجمهور وإعدادات القنوات.' } }).catch(() => undefined);
    }
  }
  return queued;
}

export function unsubscribeUrl(userId: string) { return `${publicOrigin()}/notifications/unsubscribe/${unsubscribeToken(userId)}`; }

export async function recipientStillEligible(userId: string, entityId: string, audience: string, filters: Prisma.JsonValue) {
  const f = filtersSchema.parse(filters);
  const recipients = await resolveRecipients(audience as Audience, { ...f, userIds: [userId] });
  return recipients.find(r => r.id === userId && r.entityId === entityId) || null;
}
