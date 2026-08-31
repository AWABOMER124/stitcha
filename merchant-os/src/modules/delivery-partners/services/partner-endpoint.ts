import { BusinessRuleError } from '@/lib/errors';

/** Origins approved by operations, never by the partner submitting the form. */
export function validatePartnerEndpoint(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new BusinessRuleError('Invalid partner API URL'); }
  if (url.username || url.password || url.search || url.hash) throw new BusinessRuleError('Invalid partner API URL');
  const localTest = process.env.NODE_ENV !== 'production' && process.env.DELIVERY_PARTNER_ALLOW_LOCAL_TEST === 'true' && url.hostname === '127.0.0.1';
  if (!localTest) {
    const allowed = (process.env.DELIVERY_PARTNER_API_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean);
    if (url.protocol !== 'https:' || !allowed.includes(url.origin)) throw new BusinessRuleError('API origin must be HTTPS and approved by platform operations');
  }
  return url;
}
