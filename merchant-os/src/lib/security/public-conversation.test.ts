import { describe, expect, it } from 'vitest';
import { createConversationToken, hashConversationToken, readConversationToken } from './public-conversation';

describe('public conversation tokens', () => {
  it('creates opaque tokens and stores only a stable hash', () => {
    const first = createConversationToken();
    const second = createConversationToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).toBe(hashConversationToken(first.token));
    expect(first.hash).toHaveLength(64);
    expect(first.hash).not.toContain(first.token);
  });

  it('reads only bounded tokens from the dedicated header', () => {
    expect(readConversationToken(new Request('https://example.com', { headers: { 'x-conversation-token': 'safe-token' } }))).toBe('safe-token');
    expect(readConversationToken(new Request('https://example.com', { headers: { 'x-conversation-token': 'x'.repeat(129) } }))).toBeNull();
  });
});
