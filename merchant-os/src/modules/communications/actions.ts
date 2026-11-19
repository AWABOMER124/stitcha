'use server';

import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { auth } from '@/lib/auth/config';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { filtersSchema, audiences } from './contracts';
import { resolveRecipients } from './recipients';
import { activateRule, campaignDetails, cancelCampaign, createRuleFromTemplate, createTemplate, getCenterData, launchCampaign, pauseRule, previewMessage, retryCampaignFailures, saveDraft, saveTemplate, updateRuleFilters } from './service';

type Serialized<T> = T extends Date ? string : T extends (infer U)[] ? Serialized<U>[] : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
function serialize<T>(value: T): Serialized<T> { return JSON.parse(JSON.stringify(value)); }
function errorMessage(e: unknown) {
  if (e instanceof z.ZodError) return e.issues[0]?.message || 'راجع الحقول المطلوبة';
  return e instanceof Error && !e.name.startsWith('Prisma') ? e.message : 'تعذر تنفيذ العملية؛ حاول مجددًا';
}
async function managed<T>(fn: (actorId: string) => Promise<T>) {
  try { const actor = await requirePlatformPermission(PLATFORM_PERMISSIONS.COMMUNICATIONS_MANAGE); return { success: true as const, data: serialize(await fn(actor.id)) }; }
  catch (error) { return { success: false as const, error: errorMessage(error) }; }
}
const idSchema = z.string().cuid();
export type CenterData = Serialized<Awaited<ReturnType<typeof getCenterData>>>;
export type MessagePreview = Awaited<ReturnType<typeof previewMessage>>;
export type CampaignDetail = Serialized<Awaited<ReturnType<typeof campaignDetails>>>;

export async function getCommunicationCenterAction() { return managed(() => getCenterData()); }
export async function previewCommunicationAction(input: unknown) { return managed(actor => previewMessage(input, actor)); }
export async function saveCommunicationDraftAction(input: unknown, id?: string) { return managed(actor => saveDraft(input, actor, id ? idSchema.parse(id) : undefined)); }
export async function launchCommunicationAction(id: string, token: string) { return managed(actor => launchCampaign(idSchema.parse(id), z.string().max(2000).parse(token), actor)); }
export async function cancelCommunicationAction(id: string) { return managed(() => cancelCampaign(idSchema.parse(id))); }
export async function retryCommunicationAction(id: string) { return managed(() => retryCampaignFailures(idSchema.parse(id))); }
export async function getCommunicationDetailsAction(id: string) { return managed(() => campaignDetails(idSchema.parse(id))); }
export async function saveCommunicationTemplateAction(id: string, input: unknown) { return managed(() => saveTemplate(idSchema.parse(id), input)); }
export async function createCommunicationTemplateAction(input: unknown) { return managed(() => createTemplate(input)); }
export async function createCommunicationRuleAction(templateId: string) { return managed(() => createRuleFromTemplate(idSchema.parse(templateId))); }
export async function updateCommunicationRuleAction(id: string, input: unknown) { return managed(() => updateRuleFilters(idSchema.parse(id), input)); }
export async function activateCommunicationRuleAction(id: string, token: string) { return managed(actor => activateRule(idSchema.parse(id), z.string().max(2000).parse(token), actor)); }
export async function pauseCommunicationRuleAction(id: string) { return managed(() => pauseRule(idSchema.parse(id))); }
export async function findCommunicationRecipientsAction(input: unknown) {
  return managed(async () => {
    const data = z.object({ audience: z.enum(audiences), filters: filtersSchema }).parse(input);
    const rows = await resolveRecipients(data.audience, { ...data.filters, userIds: [] });
    return { total: rows.length, rows: rows.slice(0, 100).map(r => ({ id: r.id, name: r.name, businessName: r.businessName, email: r.email, phone: r.phone })) };
  });
}

async function userId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('سجّل دخولك أولًا');
  return session.user.id;
}
export async function getPersonalUnreadCountAction() {
  try { const id = await userId(); return { success: true as const, data: await prisma.communicationDelivery.count({ where: { userId: id, channel: 'IN_APP', status: 'DELIVERED', readAt: null } }) }; }
  catch (error) { return { success: false as const, error: errorMessage(error) }; }
}
export async function getPersonalMessagesAction(messageId?:string) {
  try {
    const id = await userId();
    const selected=messageId?idSchema.parse(messageId):undefined;
    const [rows, unread, preference] = await Promise.all([
      prisma.communicationDelivery.findMany({ where: { userId: id, channel: 'IN_APP', status: 'DELIVERED', ...(selected?{id:selected}:{}) }, take: 100, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, body: true, actionPath: true, createdAt: true, readAt: true } }),
      prisma.communicationDelivery.count({ where: { userId: id, channel: 'IN_APP', status: 'DELIVERED', readAt: null } }),
      prisma.communicationPreference.findUnique({ where: { userId: id } }),
    ]);
    return { success: true as const, data: serialize({ rows, unread, preference: { marketing: preference?.marketing ?? true, email: preference?.email ?? true, whatsapp: preference?.whatsapp ?? true } }) };
  } catch (error) { return { success: false as const, error: errorMessage(error) }; }
}
export async function markPersonalMessagesReadAction(ids: string[]) {
  try {
    const id = await userId(), parsed = z.array(idSchema).min(1).max(100).parse(ids);
    const result = await prisma.communicationDelivery.updateMany({ where: { userId: id, id: { in: parsed }, channel: 'IN_APP', status: 'DELIVERED' }, data: { readAt: new Date() } });
    return { success: true as const, data: result };
  } catch (error) { return { success: false as const, error: errorMessage(error) }; }
}
export async function saveCommunicationPreferenceAction(input: unknown) {
  try {
    const id = await userId(), data = z.object({ marketing: z.boolean(), email: z.boolean(), whatsapp: z.boolean() }).parse(input);
    await prisma.communicationPreference.upsert({ where: { userId: id }, create: { userId: id, ...data }, update: data });
    return { success: true as const };
  } catch (error) { return { success: false as const, error: errorMessage(error) }; }
}
