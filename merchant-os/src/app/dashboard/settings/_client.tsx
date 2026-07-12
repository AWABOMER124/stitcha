'use client';

import { useState, useEffect, useTransition } from 'react';
import { updateMerchantSettingsAction, updateStorefrontSettingsAction } from '@/modules/settings/actions';
import { saveWhatsAppConfigAction, removeWhatsAppConfigAction } from '@/modules/whatsapp-channel/actions';

interface MerchantSettings {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
}

interface StorefrontSettings {
  welcomeText: string | null;
  isOpen: boolean;
  minimumOrderAmount: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
}

interface WhatsAppConfig {
  isConfigured: boolean;
  phoneNumberId?: string;
  wabaId?: string | null;
  displayPhone?: string | null;
  isActive?: boolean;
  accessTokenPreview?: string;
}

export function SettingsClient({
  initialMerchant,
  initialStorefront,
  initialWhatsApp,
}: {
  initialMerchant: MerchantSettings | null;
  initialStorefront: StorefrontSettings | null;
  initialWhatsApp: WhatsAppConfig;
}) {
  const [isPending, startTransition] = useTransition();

  const [merchantForm, setMerchantForm] = useState({
    name: initialMerchant?.name ?? '',
    description: initialMerchant?.description ?? '',
    phone: initialMerchant?.phone ?? '',
    email: initialMerchant?.email ?? '',
    address: initialMerchant?.address ?? '',
  });
  const [merchantSaved, setMerchantSaved] = useState(false);
  const [merchantError, setMerchantError] = useState('');

  const [storeForm, setStoreForm] = useState({
    welcomeText: initialStorefront?.welcomeText ?? '',
    isOpen: initialStorefront?.isOpen ?? true,
    minimumOrderAmount: String(initialStorefront?.minimumOrderAmount ?? 0),
    deliveryEnabled: initialStorefront?.deliveryEnabled ?? true,
    pickupEnabled: initialStorefront?.pickupEnabled ?? true,
  });
  const [storeSaved, setStoreSaved] = useState(false);
  const [storeError, setStoreError] = useState('');

  const [whatsapp, setWhatsapp] = useState(initialWhatsApp);
  const [waForm, setWaForm] = useState({
    phoneNumberId: initialWhatsApp.phoneNumberId ?? '',
    wabaId: initialWhatsApp.wabaId ?? '',
    displayPhone: initialWhatsApp.displayPhone ?? '',
    accessToken: '',
  });
  const [waSaved, setWaSaved] = useState(false);
  const [waError, setWaError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp`);
  }, []);

  function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setWaError('');
    setWaSaved(false);
    startTransition(async () => {
      const res = await saveWhatsAppConfigAction({
        phoneNumberId: waForm.phoneNumberId,
        wabaId: waForm.wabaId || undefined,
        displayPhone: waForm.displayPhone || undefined,
        accessToken: waForm.accessToken,
      });
      if (res.success) {
        setWhatsapp(res.data as WhatsAppConfig);
        setWaForm((f) => ({ ...f, accessToken: '' }));
        setWaSaved(true);
      } else setWaError(res.error);
    });
  }

  function disconnectWhatsApp() {
    setWaError('');
    startTransition(async () => {
      const res = await removeWhatsAppConfigAction();
      if (res.success) {
        setWhatsapp({ isConfigured: false });
        setWaForm({ phoneNumberId: '', wabaId: '', displayPhone: '', accessToken: '' });
      } else setWaError(res.error);
    });
  }

  function saveMerchant(e: React.FormEvent) {
    e.preventDefault();
    setMerchantError('');
    setMerchantSaved(false);
    startTransition(async () => {
      const res = await updateMerchantSettingsAction({
        name: merchantForm.name,
        description: merchantForm.description || undefined,
        phone: merchantForm.phone || undefined,
        email: merchantForm.email || undefined,
        address: merchantForm.address || undefined,
      });
      if (res.success) setMerchantSaved(true);
      else setMerchantError(res.error);
    });
  }

  function saveStorefront(e: React.FormEvent) {
    e.preventDefault();
    setStoreError('');
    setStoreSaved(false);
    startTransition(async () => {
      const res = await updateStorefrontSettingsAction({
        welcomeText: storeForm.welcomeText || undefined,
        isOpen: storeForm.isOpen,
        minimumOrderAmount: Number(storeForm.minimumOrderAmount) || 0,
        deliveryEnabled: storeForm.deliveryEnabled,
        pickupEnabled: storeForm.pickupEnabled,
      });
      if (res.success) setStoreSaved(true);
      else setStoreError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Store profile */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏪</span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Store Profile</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Business name and contact info</p>
          </div>
        </div>
        {merchantError && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{merchantError}</div>}
        {merchantSaved && <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">Saved</div>}
        <form onSubmit={saveMerchant} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Business name</label>
            <input value={merchantForm.name} onChange={(e) => setMerchantForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Description</label>
            <textarea rows={2} value={merchantForm.description} onChange={(e) => setMerchantForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Phone</label>
              <input value={merchantForm.phone} onChange={(e) => setMerchantForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Email</label>
              <input type="email" value={merchantForm.email} onChange={(e) => setMerchantForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Address</label>
            <input value={merchantForm.address} onChange={(e) => setMerchantForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Storefront */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🌐</span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Storefront</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Ordering options customers see</p>
          </div>
        </div>
        {storeError && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{storeError}</div>}
        {storeSaved && <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">Saved</div>}
        <form onSubmit={saveStorefront} className="space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
            <span className="text-sm text-[var(--foreground)]">Store is open for orders</span>
            <input type="checkbox" checked={storeForm.isOpen} onChange={(e) => setStoreForm((f) => ({ ...f, isOpen: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
            <span className="text-sm text-[var(--foreground)]">Delivery enabled</span>
            <input type="checkbox" checked={storeForm.deliveryEnabled} onChange={(e) => setStoreForm((f) => ({ ...f, deliveryEnabled: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
            <span className="text-sm text-[var(--foreground)]">Pickup enabled</span>
            <input type="checkbox" checked={storeForm.pickupEnabled} onChange={(e) => setStoreForm((f) => ({ ...f, pickupEnabled: e.target.checked }))} />
          </label>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Minimum order amount (SDG)</label>
            <input type="number" min="0" value={storeForm.minimumOrderAmount}
              onChange={(e) => setStoreForm((f) => ({ ...f, minimumOrderAmount: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Welcome message</label>
            <textarea rows={2} value={storeForm.welcomeText} onChange={(e) => setStoreForm((f) => ({ ...f, welcomeText: e.target.value }))}
              placeholder="Shown at the top of your storefront"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <button type="submit" disabled={isPending}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving...' : 'Save storefront'}
          </button>
        </form>
      </div>

      {/* WhatsApp channel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 lg:col-span-2">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💬</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">WhatsApp channel</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Connect your own WhatsApp Business number to receive and reply to customers in the Inbox</p>
          </div>
          {whatsapp.isConfigured && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${whatsapp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
              {whatsapp.isActive ? 'Connected' : 'Disabled'}
            </span>
          )}
        </div>

        {waError && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{waError}</div>}
        {waSaved && <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">Saved</div>}

        <div className="mb-4 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)] p-3">
          <p className="text-xs font-medium text-[var(--foreground)] mb-1">Webhook URL (set this in your Meta App's WhatsApp configuration)</p>
          <code className="text-xs text-[var(--muted-foreground)] break-all">{webhookUrl || '...'}</code>
        </div>

        <form onSubmit={saveWhatsApp} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Phone Number ID</label>
            <input value={waForm.phoneNumberId} onChange={(e) => setWaForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
              placeholder="from Meta Business Suite"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">WhatsApp Business Account ID (optional)</label>
            <input value={waForm.wabaId} onChange={(e) => setWaForm((f) => ({ ...f, wabaId: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Display phone number (optional)</label>
            <input value={waForm.displayPhone} onChange={(e) => setWaForm((f) => ({ ...f, displayPhone: e.target.value }))}
              placeholder="+2499xxxxxxxx"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
              Access token {whatsapp.isConfigured && <span className="text-[var(--muted-foreground)] font-normal">(current: {whatsapp.accessTokenPreview})</span>}
            </label>
            <input type="password" value={waForm.accessToken} onChange={(e) => setWaForm((f) => ({ ...f, accessToken: e.target.value }))}
              placeholder={whatsapp.isConfigured ? 'Leave blank to keep current token' : 'Meta system-user access token'}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={isPending || !waForm.phoneNumberId || (!waForm.accessToken && !whatsapp.isConfigured)}
              className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
              {isPending ? 'Saving...' : whatsapp.isConfigured ? 'Update connection' : 'Connect WhatsApp'}
            </button>
            {whatsapp.isConfigured && (
              <button type="button" onClick={disconnectWhatsApp} disabled={isPending}
                className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--background)] disabled:opacity-50 transition-colors">
                Disconnect
              </button>
            )}
          </div>
        </form>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Note: WhatsApp only allows free-form replies within 24 hours of the customer's last message — outside that window, messages require a pre-approved template.
        </p>
      </div>
    </div>
  );
}
