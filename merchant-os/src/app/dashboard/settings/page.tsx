import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/config';
import { getMerchantSettingsAction, getStorefrontSettingsAction } from '@/modules/settings/actions';
import { getWhatsAppConfigAction } from '@/modules/whatsapp-channel/actions';
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/translations';
import { SettingsClient, type MerchantSettings, type StorefrontSettings, type WhatsAppConfig } from './_client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.merchantId) redirect('/login');

  const [merchantRes, storefrontRes, whatsappRes, cookieStore] = await Promise.all([
    getMerchantSettingsAction(),
    getStorefrontSettingsAction(),
    getWhatsAppConfigAction(),
    cookies(),
  ]);

  const merchant = merchantRes.success ? (merchantRes.data as unknown as MerchantSettings) : null;
  const storefront = storefrontRes.success ? (storefrontRes.data as unknown as StorefrontSettings) : null;
  const whatsapp = whatsappRes.success ? (whatsappRes.data as unknown as WhatsAppConfig) : { isConfigured: false };
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const t = dictionaries[locale].settingsPage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>
      <SettingsClient initialMerchant={merchant} initialStorefront={storefront} initialWhatsApp={whatsapp} />
    </div>
  );
}
