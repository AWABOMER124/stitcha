import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import sharp from 'sharp';

const baseUrl = process.env.AI_CORE_BASE_URL?.trim().replace(/\/$/, '');
const secret = process.env.AI_CORE_SECRET_WASLA?.trim();
const timeoutMs = Number(process.env.AI_CORE_TIMEOUT_MS ?? 120_000);

if (!baseUrl || !secret) {
  console.error('AI image readiness: FAIL — missing AI Core configuration');
  process.exit(1);
}

const requestId = randomUUID();
const token = await new SignJWT({
  org: 'wasla-readiness-probe',
  permissions: ['images.enhance'],
  language: 'ar',
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer('wasla')
  .setAudience('ai-core')
  .setSubject('production-readiness')
  .setIssuedAt()
  .setExpirationTime('5m')
  .setJti(requestId)
  .sign(new TextEncoder().encode(secret));

const sample = await sharp({
  create: { width: 512, height: 512, channels: 3, background: '#f3f5f7' },
})
  .composite([{ input: Buffer.from('<svg width="512" height="512"><rect x="156" y="96" width="200" height="320" rx="28" fill="#13c4a3"/><circle cx="256" cy="185" r="46" fill="#07111f"/></svg>') }])
  .webp({ quality: 90 })
  .toBuffer();

const form = new FormData();
form.append('image', new Blob([sample], { type: 'image/webp' }), 'readiness-product.webp');
form.append('mode', 'CLEAN_WHITE');
form.append('scene', 'خلفية استوديو بيضاء بسيطة بدون نص أو شعارات');

const response = await fetch(`${baseUrl}/api/v1/wasla/images/enhance`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
  body: form,
  signal: AbortSignal.timeout(timeoutMs),
});
const body = await response.json().catch(() => null);
const imageBytes = typeof body?.image_base64 === 'string'
  ? Buffer.from(body.image_base64, 'base64').length
  : 0;

if (!response.ok || imageBytes < 1_000 || !['image/png', 'image/webp'].includes(body?.mime_type)) {
  console.error(`AI image readiness: FAIL — HTTP ${response.status}`);
  process.exit(1);
}

console.log(`AI image readiness: PASS — returned ${body.mime_type}, ${imageBytes} bytes`);
