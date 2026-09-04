import { describe, expect, it } from 'vitest';
import { FeatureNotAvailableError, UsageLimitReachedError } from './app-error';
import { handleError } from './handler';

describe('structured entitlement errors', () => {
  it('serializes feature upgrade metadata for API consumers', () => {
    expect(handleError(new FeatureNotAvailableError('ai.merchant_copilot'))).toEqual({
      success: false,
      error: {
        code: 'FEATURE_NOT_AVAILABLE', message: 'هذه الميزة غير متاحة في باقتك الحالية', statusCode: 403,
        feature: 'ai.merchant_copilot', upgrade_required: true,
      },
    });
  });

  it('serializes limit usage and reset time without exposing provider tokens', () => {
    expect(handleError(new UsageLimitReachedError({
      limitKey: 'ai.store.edit', used: 5, limit: 5, resetAt: new Date('2026-10-01T00:00:00Z'),
    }))).toMatchObject({
      error: { code: 'USAGE_LIMIT_REACHED', limit_key: 'ai.store.edit', used: 5, limit: 5, reset_at: '2026-10-01T00:00:00.000Z' },
    });
  });
});
