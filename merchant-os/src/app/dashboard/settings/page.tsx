import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getMerchantSettingsAction, getStorefrontSettingsAction } from '@/modules/settings/actions';
import { getWhatsAppConfigAction } from '@/modules/whatsapp-channel/actions';
import { SettingsClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [merchantRes, storefrontRes, whatsappRes] = await Promise.all([
    getMerchantSettingsAction(),
    getStorefrontSettingsAction(),
    getWhatsAppConfigAction(),
  ]);

  const merchant = merchantRes.success ? (merchantRes.data as any) : null;
  const storefront = storefrontRes.success ? (storefrontRes.data as any) : null;
  const whatsapp = whatsappRes.success ? (whatsappRes.data as any) : { isConfigured: false };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Configure your store and storefront</p>
      </div>
      <SettingsClient initialMerchant={merchant} initialStorefront={storefront} initialWhatsApp={whatsapp} />
    </div>
  );
}
