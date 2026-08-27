import { headers } from 'next/headers';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

function configuredOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return LOCAL_HOST.test(url.host) ? null : url.origin;
  } catch {
    return null;
  }
}

export function resolvePublicOrigin(requestHeaders: Pick<Headers, 'get'>): string {
  const configured = configuredOrigin();
  if (configured) return configured;
  const forwardedHost = requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || requestHeaders.get('host')?.trim();
  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return 'https://wassla-sd.shop';
  const forwardedProto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto === 'http' || forwardedProto === 'https'
    ? forwardedProto
    : LOCAL_HOST.test(host) ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function getPublicOrigin() {
  return resolvePublicOrigin(await headers());
}
