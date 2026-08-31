import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getPublicOrigin } from '@/lib/public-origin';
import { IntegrationGuide } from '@/components/partner/integration-guide';
export default async function MerchantDeliveryDocs() { const session = await auth(); if (!session?.user.merchantId) redirect('/login'); return <IntegrationGuide origin={await getPublicOrigin()} />; }
