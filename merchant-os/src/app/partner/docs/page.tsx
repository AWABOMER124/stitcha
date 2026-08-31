import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { getPublicOrigin } from '@/lib/public-origin';
import { IntegrationGuide } from '@/components/partner/integration-guide';
export default async function PartnerDocs() { await requireDeliveryPartner(); return <IntegrationGuide origin={await getPublicOrigin()} />; }
