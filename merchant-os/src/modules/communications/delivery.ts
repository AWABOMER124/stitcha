import type { OutboxJob } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { EmailProvider } from '@/services/notifications/providers/email.provider';
import { WhatsAppProvider } from '@/services/notifications/providers/whatsapp.provider';
import { channelExclusion } from './recipients';
import type { Channel } from './contracts';
import { DELIVERY_TOPIC, recipientStillEligible, unsubscribeUrl } from './service';

const terminal = ['ACCEPTED', 'DELIVERED', 'FAILED', 'SKIPPED', 'CANCELLED', 'UNKNOWN'];
async function finishCampaign(id: string) {
  const remaining = await prisma.communicationDelivery.count({ where: { campaignId: id, status: { notIn: terminal } } });
  if (!remaining) await prisma.communicationCampaign.updateMany({ where: { id, status: { in: ['QUEUED', 'RUNNING', 'SCHEDULED'] } }, data: { status: 'COMPLETED' } });
}
export function classifyDeliveryError(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : '';
  if (/AbortError|TimeoutError|timed?\s?out|fetch failed|\b5\d\d\b/i.test(text)) return { uncertain: true, permanent: false, message: 'لم يؤكد المزوّد النتيجة. راجع القناة قبل إعادة الإرسال.' };
  if (/\b(400|401|403|404|422)\b/.test(text)) return { uncertain: false, permanent: true, message: 'رفض المزوّد الطلب. راجع بيانات المستلم وصلاحية إعدادات القناة.' };
  if (/\b429\b/.test(text)) return { uncertain: false, permanent: false, message: 'بلغت القناة حد الإرسال المؤقت؛ ستتم إعادة المحاولة.' };
  return { uncertain: false, permanent: false, message: 'تعذر الإرسال مؤقتًا؛ ستتم إعادة المحاولة.' };
}

export async function deliverCommunication(payload: unknown, job: OutboxJob) {
  if (!payload || typeof payload !== 'object' || !('deliveryId' in payload) || typeof payload.deliveryId !== 'string') throw new Error('Invalid communication delivery');
  const d = await prisma.communicationDelivery.findUnique({ where: { id: payload.deliveryId }, include: { campaign: true } });
  if (!d) return;
  if (terminal.includes(d.status)) { await finishCampaign(d.campaignId); return; }
  if (d.status === 'SENDING' && d.channel === 'WHATSAPP') {
    await prisma.communicationDelivery.update({ where: { id: d.id }, data: { status: 'UNKNOWN', lastError: 'توقف العامل أثناء الإرسال. تحقق من واتساب قبل إرسال نسخة أخرى.' } });
    await finishCampaign(d.campaignId); return;
  }
  if (d.campaign.status === 'CANCELLED') {
    await prisma.communicationDelivery.update({ where: { id: d.id }, data: { status: 'CANCELLED' } }); return;
  }
  const rule = d.campaign.ruleId ? await prisma.communicationRule.findUnique({ where: { id: d.campaign.ruleId } }) : null;
  const recipient = await recipientStillEligible(d.userId, d.entityId, d.campaign.audience, d.campaign.filters);
  let exclusion = d.campaign.ruleId && !rule?.isActive ? 'أوقفت القاعدة قبل بدء الإرسال' : !recipient ? 'لم يعد الحساب يطابق شروط الرسالة' : channelExclusion(recipient, d.channel as Channel, d.campaign.purpose);
  if (recipient && !exclusion) {
    const current = d.channel === 'EMAIL' ? recipient.email : d.channel === 'WHATSAPP' ? recipient.phone : recipient.id;
    if (current !== d.recipient) exclusion = 'تغيرت بيانات الاتصال بعد المعاينة';
  }
  if (exclusion || !recipient) {
    await prisma.communicationDelivery.update({ where: { id: d.id }, data: { status: 'SKIPPED', lastError: exclusion } });
    await finishCampaign(d.campaignId); return;
  }
  // A stable email idempotency key covers a recovered outbox attempt. Unknown
  // WhatsApp results are held for review rather than automatically duplicated.
  const claim = await prisma.communicationDelivery.updateMany({ where: { id: d.id, status: { in: ['QUEUED', 'RETRYING', 'SENDING'] }, campaign: { status: { not: 'CANCELLED' } } }, data: { status: 'SENDING', startedAt: new Date(), lastError: null } });
  if (!claim.count) return;
  await prisma.communicationCampaign.updateMany({ where: { id: d.campaignId, status: { in: ['SCHEDULED', 'QUEUED'] } }, data: { status: 'RUNNING' } });
  try {
    if (d.channel !== 'IN_APP') {
      const unsubscribe = d.campaign.purpose === 'MARKETING' ? unsubscribeUrl(d.userId) : null;
      const body = d.body + (unsubscribe ? `\n\nلإيقاف الرسائل التسويقية: ${unsubscribe}` : '');
      const notification = { type: 'SYSTEM' as const, channel: d.channel as 'EMAIL' | 'WHATSAPP', recipient: d.recipient, title: d.title, body,
        metadata: { idempotencyKey: `wasla-communication-${d.id}`, managedByOutbox: true, ...(unsubscribe ? { unsubscribeUrl: unsubscribe } : {}) } };
      await (d.channel === 'EMAIL' ? new EmailProvider() : new WhatsAppProvider()).send(notification);
    }
  } catch (error) {
    const failure = classifyDeliveryError(error), uncertain = failure.uncertain && d.channel === 'WHATSAPP', exhausted = job.attempts >= job.maxAttempts;
    await prisma.communicationDelivery.update({ where: { id: d.id }, data: {
      status: uncertain ? 'UNKNOWN' : failure.permanent || exhausted ? 'FAILED' : 'RETRYING',
      lastError: exhausted && !failure.permanent ? 'استُنفدت محاولات الإرسال؛ راجع إعدادات القناة قبل المحاولة اليدوية.' : failure.message,
    } });
    if (uncertain || failure.permanent || exhausted) { await finishCampaign(d.campaignId); return; }
    throw new Error(failure.message);
  }
  // A persistence failure after provider acceptance must never be mistaken
  // for a provider rejection; leave SENDING for safe stale-claim recovery.
  await prisma.communicationDelivery.update({ where: { id: d.id }, data: { status: d.channel === 'IN_APP' ? 'DELIVERED' : 'ACCEPTED', acceptedAt: new Date(), lastError: null } });
  await finishCampaign(d.campaignId);
}
export const communicationJobHandlers = new Map([[DELIVERY_TOPIC, deliverCommunication]]);
