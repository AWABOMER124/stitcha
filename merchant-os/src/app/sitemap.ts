import type { MetadataRoute } from 'next';
import { blogPosts } from '@/content/blog-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://wassla-sd.shop').replace(/\/$/, '');
  const updated = new Date();
  return [
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
}
