import { BusinessRuleError } from '@/lib/errors';

/** Origins approved by operations, never by the partner submitting the form. */
export function validatePartnerEndpoint(value: string, approvedOrigin?: string | null, allowPendingReview = false) {
  let url: URL;
  try { url = new URL(value); } catch { throw new BusinessRuleError('Invalid partner API URL'); }
  if (url.username || url.password || url.search || url.hash) throw new BusinessRuleError('Invalid partner API URL');
  const blockedHostname = url.hostname === 'localhost' || url.hostname.endsWith('.local') || /^(127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) || url.hostname === '::1';
  const localTest = process.env.NODE_ENV !== 'production' && process.env.DELIVERY_PARTNER_ALLOW_LOCAL_TEST === 'true' && url.hostname === '127.0.0.1';
  if (!localTest) {
    if (url.protocol !== 'https:' || blockedHostname) throw new BusinessRuleError('Partner endpoint must be a public HTTPS URL');
    if (allowPendingReview) return url;
    if (approvedOrigin && approvedOrigin === url.origin) return url;
    const allowed = (process.env.DELIVERY_PARTNER_API_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
    if (!allowed.includes(url.origin)) throw new BusinessRuleError('API origin must be approved by platform operations');
  }
  return url;
}
