import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

const baseUrl = process.env.AI_CORE_BASE_URL?.trim().replace(/\/$/, '');
const secret = process.env.AI_CORE_SECRET_WASLA?.trim();
const timeoutMs = Number(process.env.AI_CORE_TIMEOUT_MS ?? 15_000);

function fail(message) {
  console.error(`AI Core readiness: FAIL — ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`AI Core readiness: PASS — ${message}`);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

async function main() {
  if (!baseUrl && !secret) {
    fail('AI_CORE_BASE_URL and AI_CORE_SECRET_WASLA are not configured');
    return;
  }
  if (!baseUrl || !secret) {
    fail('partial AI Core configuration detected; set both AI_CORE_BASE_URL and AI_CORE_SECRET_WASLA');
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    fail('AI_CORE_BASE_URL is not a valid absolute URL');
    return;
  }

  if (parsedUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
    fail('AI_CORE_BASE_URL must use HTTPS outside localhost');
    return;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    fail('AI_CORE_TIMEOUT_MS must be between 1000 and 120000 milliseconds');
    return;
  }

  const healthResponse = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const health = await readJson(healthResponse);
  if (!healthResponse.ok || health?.status !== 'ok') {
    fail(`health endpoint returned HTTP ${healthResponse.status}`);
    return;
  }
  pass(`health endpoint is reachable (${health.version ?? 'unknown version'})`);

  const requestId = randomUUID();
  const token = await new SignJWT({
    org: 'wasla-readiness-probe',
    permissions: [],
    language: 'ar',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('wasla')
    .setAudience('ai-core')
    .setSubject('wasla-readiness')
    .setIssuedAt()
    .setExpirationTime('2m')
    .setJti(requestId)
    .sign(new TextEncoder().encode(secret));

  const toolsResponse = await fetch(`${baseUrl}/api/v1/tools`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const tools = await readJson(toolsResponse);
  if (!toolsResponse.ok) {
    const code = tools?.error?.code ?? `HTTP_${toolsResponse.status}`;
    fail(`service JWT was rejected by AI Core (${code}); verify AI_CORE_SECRET_WASLA matches on both services`);
    return;
  }
  if (tools?.product !== 'wasla' || !Array.isArray(tools?.tools)) {
    fail('authenticated AI Core response did not identify the caller as product=wasla');
    return;
  }
  pass(`service JWT contract verified; ${tools.tools.length} Wasla tool(s) available`);

  console.log('AI Core readiness: READY');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
