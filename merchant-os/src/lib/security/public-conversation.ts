import { createHash, randomBytes } from 'node:crypto';

export function createConversationToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashConversationToken(token) };
}

export function hashConversationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function readConversationToken(request: Request) {
  const token = request.headers.get('x-conversation-token')?.trim();
  return token && token.length <= 128 ? token : null;
}
