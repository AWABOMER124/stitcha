import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { MessageInput } from './contracts';

function secret() {
  const key = process.env.AUTH_SECRET;
  if (!key || key.length < 16) throw new Error('إعداد حماية الرسائل غير مكتمل');
  return key;
}
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function equal(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function previewDigest(input: MessageInput, eligible: string[]) {
  return createHash('sha256').update(JSON.stringify({ input, eligible: [...eligible].sort() })).digest('hex');
}
export function createPreviewToken(digest: string, actorId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ digest, actorId, expires: now + 15 * 60000 })).toString('base64url');
  return `${payload}.${sign('preview:' + payload)}`;
}
export function verifyPreviewToken(token: string, digest: string, actorId: string, now = Date.now()) {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !equal(signature, sign('preview:' + payload))) throw new Error('المعاينة غير صالحة؛ أعد معاينة الرسالة');
  let value;
  try { value = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new Error('المعاينة غير صالحة'); }
  if (value.actorId !== actorId || value.digest !== digest || value.expires < now) throw new Error('تغيرت الرسالة أو قائمة المستلمين، أو انتهت المعاينة. عاين الرسالة مجددًا قبل الإرسال.');
}
export function unsubscribeToken(userId: string) {
  const payload = Buffer.from(userId).toString('base64url');
  return `${payload}.${sign('unsubscribe-marketing:' + payload)}`;
}
export function readUnsubscribeToken(token: string) {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || payload.length > 150 || !equal(signature, sign('unsubscribe-marketing:' + payload))) throw new Error('رابط تفضيلات غير صالح');
  return Buffer.from(payload, 'base64url').toString();
}
