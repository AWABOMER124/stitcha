import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('structured logger redaction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('redacts access and refresh token fields recursively', () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('session event', {
      accessToken: 'access-secret',
      nested: { refreshToken: 'refresh-secret', tokenHash: 'stored-hash' },
    });

    const entry = JSON.parse(output.mock.calls[0][0] as string);
    expect(entry.meta).toEqual({
      accessToken: '[redacted]',
      nested: { refreshToken: '[redacted]', tokenHash: '[redacted]' },
    });
  });
});
