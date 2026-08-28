import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://wassla-sd.shop').replace(/\/$/, '');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/dashboard/', '/api/', '/distributor/'] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
