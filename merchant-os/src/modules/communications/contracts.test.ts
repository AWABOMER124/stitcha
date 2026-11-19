import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertMessageVariables, filtersSchema, messageSchema, renderMessage } from './contracts';
import { createPreviewToken, previewDigest, readUnsubscribeToken, unsubscribeToken, verifyPreviewToken } from './security';
import { channelExclusion, recipientWhere, type Recipient } from './recipients';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '@/lib/platform-permissions';
vi.mock('@/lib/db/prisma', () => ({ default: {} }));
afterEach(() => vi.unstubAllEnvs());
const input = messageSchema.parse({ name: 'تذكير', audience: 'MERCHANT', purpose: 'SERVICE', filters: {}, channels: ['IN_APP'], title: 'أهلًا {{name}}', body: 'راجع {{action_url}}' });
const person: Recipient = { id: 'c123456789012345678901234', entityId: 'store', merchantId: 'store', name: 'أحمد', businessName: 'متجر', email: 'test@example.com', phone: '+966500000000', preference: null, storePath: '/store/test', createdAt: '2026-11-01' };
describe('Communication contracts and recipient isolation', () => {
  it('limits campaign management to authorized platform roles', () => {
    expect(hasPlatformPermission('PLATFORM_OWNER', PLATFORM_PERMISSIONS.COMMUNICATIONS_MANAGE)).toBe(true);
    expect(hasPlatformPermission('PLATFORM_ADMIN', PLATFORM_PERMISSIONS.COMMUNICATIONS_MANAGE)).toBe(true);
    for (const role of ['PLATFORM_SUPPORT', 'PLATFORM_FINANCE', 'PLATFORM_OPERATIONS', 'MERCHANT_OWNER'] as const) expect(hasPlatformPermission(role, PLATFORM_PERMISSIONS.COMMUNICATIONS_MANAGE)).toBe(false);
  });
  it('only allows the supported channels and safe internal links', () => {
    expect(() => messageSchema.parse({ ...input, channels: ['SMS'] })).toThrow();
    for (const actionPath of ['//evil.example', 'https://evil.example', '/\\evil.example', '/x\r\nheader']) expect(() => messageSchema.parse({ ...input, actionPath })).toThrow();
    expect(messageSchema.parse({ ...input, channels: ['EMAIL', 'EMAIL'] }).channels).toEqual(['EMAIL']);
  });
  it('renders known variables while rejecting typos instead of sending broken templates', () => {
    expect(renderMessage('أهلًا {{ name }}', { name: 'سارة', business_name: '', platform_name: '', action_url: '', store_url: '' })).toBe('أهلًا سارة');
    expect(() => assertMessageVariables('أهلًا {{password}}')).toThrow();
    expect(() => assertMessageVariables('أهلًا {{name')).toThrow();
  });
  it('keeps individual selection inside the audience and cohort', () => {
    const where = recipientWhere('MERCHANT', filtersSchema.parse({ userIds: [person.id], segment: 'NO_PRODUCTS', minAgeDays: 2 }), new Date('2026-11-15T00:00:00Z'));
    expect(where.AND).toEqual(expect.arrayContaining([{ id: { in: [person.id] } }, expect.objectContaining({ role: 'MERCHANT_OWNER', merchantUsers: expect.objectContaining({ some: expect.objectContaining({ isOwner: true, isActive: true, merchant: expect.objectContaining({ products: { none: {} } }) }) }) })]));
    expect(() => recipientWhere('PARTNER', filtersSchema.parse({ segment: 'NO_PRODUCTS' }))).toThrow();
    expect(() => recipientWhere('MARKETER', filtersSchema.parse({ segment: 'PARTNER_UNPUBLISHED' }))).toThrow();
  });
  it('respects marketing opt-out and per-channel preferences without blocking service messages', () => {
    const r = { ...person, preference: { marketing: false, email: true, whatsapp: false } };
    expect(channelExclusion(r, 'EMAIL', 'MARKETING')).toBeTruthy();
    expect(channelExclusion(r, 'EMAIL', 'SERVICE')).toBeNull();
    expect(channelExclusion(r, 'WHATSAPP', 'SERVICE')).toBeTruthy();
    expect(channelExclusion({ ...person, phone: null }, 'WHATSAPP', 'SERVICE')).toBeTruthy();
  });
  it('binds preview approval to content, recipients, actor and expiration', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-long-and-private');
    const digest = previewDigest(input, ['recipient:email']), token = createPreviewToken(digest, 'actor', 1000);
    expect(() => verifyPreviewToken(token, digest, 'actor', 2000)).not.toThrow();
    expect(() => verifyPreviewToken(token, digest, 'different-actor', 2000)).toThrow();
    expect(() => verifyPreviewToken(token, previewDigest({ ...input, title: 'changed' }, ['recipient:email']), 'actor', 2000)).toThrow();
    expect(() => verifyPreviewToken(token, previewDigest(input, ['another-recipient:email']), 'actor', 2000)).toThrow();
    expect(() => verifyPreviewToken(token, digest, 'actor', 1000 + 16 * 60000)).toThrow();
    expect(() => verifyPreviewToken(token + 'x', digest, 'actor', 2000)).toThrow();
  });
  it('does not let a preview token authorize unsubscribe, or alter another user', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-that-is-long-and-private');
    const token = unsubscribeToken(person.id);
    expect(readUnsubscribeToken(token)).toBe(person.id);
    expect(() => readUnsubscribeToken(unsubscribeToken('other').split('.')[0] + '.' + token.split('.')[1])).toThrow();
    expect(() => readUnsubscribeToken(createPreviewToken('hash', 'actor'))).toThrow();
  });
});
