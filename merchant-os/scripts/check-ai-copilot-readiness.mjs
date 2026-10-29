import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

const baseUrl = process.env.AI_CORE_BASE_URL?.trim().replace(/\/$/, '');
const secret = process.env.AI_CORE_SECRET_WASLA?.trim();
const timeoutMs = Number(process.env.AI_CORE_TIMEOUT_MS ?? 60_000);

if (!baseUrl || !secret) {
  console.error('AI Copilot readiness: FAIL — missing AI Core configuration');
  process.exit(1);
}

const requestId = randomUUID();
const token = await new SignJWT({
  org: 'wasla-readiness-probe',
  permissions: ['merchants.view'],
  language: 'ar',
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer('wasla')
  .setAudience('ai-core')
  .setSubject('production-readiness')
  .setIssuedAt()
  .setExpirationTime('2m')
  .setJti(requestId)
  .sign(new TextEncoder().encode(secret));

const response = await fetch(`${baseUrl}/api/v1/wasla/copilot`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    question: 'اذكر نصيحة قصيرة لتحسين متجر تجريبي',
    snapshot: { orders: 3, products: 5 },
    language: 'ar',
  }),
  signal: AbortSignal.timeout(timeoutMs),
});

const body = await response.json().catch(() => null);
if (!response.ok || body?.status !== 'ok' || typeof body?.answer !== 'string' || !body.answer.trim()) {
  console.error(`AI Copilot readiness: FAIL — HTTP ${response.status}`);
  process.exit(1);
}

console.log(`AI Copilot readiness: PASS — model returned ${body.answer.trim().length} characters`);
