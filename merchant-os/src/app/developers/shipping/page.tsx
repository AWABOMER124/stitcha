import type { Metadata } from 'next';
import { IntegrationGuide } from '@/components/partner/integration-guide';
import { getPublicOrigin } from '@/lib/public-origin';

export const metadata: Metadata = {
  title: 'دليل ربط شركات التوصيل | وصلة Developers',
  description: 'توثيق Shipping API لربط شركات التوصيل مع منصة وصلة.',
};

export default async function PublicShippingDocsPage() {
  return <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-7"><IntegrationGuide origin={await getPublicOrigin()} /></main>;
}
