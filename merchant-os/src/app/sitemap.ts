import type { MetadataRoute } from 'next';
import { blogPosts } from '@/content/blog-posts';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://wassla-sd.shop').replace(/\/$/, '');
  const updated = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/register`, lastModified: updated, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/partners`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/marketers`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: updated, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: updated, changeFrequency: 'yearly', priority: 0.3 },
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  try {
    const stores = await prisma.merchant.findMany({
      where: { isActive: true, status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10_000,
    });
    return [
      ...staticEntries,
      ...stores.map((store) => ({
        url: `${baseUrl}/store/${encodeURIComponent(store.slug)}`,
        lastModified: store.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // Keep the public sitemap available during a transient database outage.
    return staticEntries;
  }
}
