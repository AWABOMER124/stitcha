import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  deploymentId: process.env.APP_RELEASE && process.env.APP_RELEASE !== 'unknown' ? process.env.APP_RELEASE : undefined,
  // Keep the initial Flight build ID and navigation deployment header equal.
  generateBuildId: async () => process.env.APP_RELEASE && process.env.APP_RELEASE !== 'unknown' ? process.env.APP_RELEASE : null,
  env: { NEXT_PUBLIC_DEPLOYMENT_RELEASE: process.env.APP_RELEASE ?? 'unknown' },
  poweredByHeader: false,
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join('; ');

    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // QUIC retries were observed dropping route/payment fetches on affected networks.
        { key: 'Alt-Svc', value: 'clear' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }, { source: '/pay/:path*', headers: [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
      { key: 'Cache-Control', value: 'private, no-store' },
    ] }];
  },
  // Keep CI and small production builders stable instead of spawning one
  // prerender worker per detected CPU core.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
