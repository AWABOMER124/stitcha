'use client';

import { useState, useTransition } from 'react';
import { SUDAN_STATES, getSudanDistricts } from '@/lib/geography/sudan';
import { createDeliveryZoneAction, updateDeliveryZoneAction, deleteDeliveryZoneAction } from '@/modules/finance/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export interface Zone {
  id: string;
  name: string;
  description?: string | null;
  city?: string | null;
  district?: string | null;
  baseFee: number | string;
  perKmFee: number | string;
  maxDistanceKm?: number | null;
  estimatedTime?: string | null;
  currency: string;
  sortOrder: number;
  isActive: boolean;
}

export function PriceListsClient({ initialZones }: { initialZones: Zone[] }) {
  const { dict } = useLocale();
  const t = dict.distributorPriceListsPage;
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    city: '',
    district: '',
    description: '',
    baseFee: '',
    perKmFee: '0',
    maxDistanceKm: '',
    estimatedTime: '',
    currency: 'SDG',
    sortOrder: '0',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createDeliveryZoneAction({
        name: form.name,
        city: form.city || undefined,
        district: form.district || undefined,
        description: form.description || undefined,
        baseFee: parseFloat(form.baseFee) || 0,
        perKmFee: parseFloat(form.perKmFee) || 0,
        maxDistanceKm: form.maxDistanceKm ? parseFloat(form.maxDistanceKm) : undefined,
        estimatedTime: form.estimatedTime || undefined,
        currency: form.currency,
        sortOrder: parseInt(form.sortOrder) || 0,
      });
      if (res.success) {
        setZones((prev) => [...prev, res.data as Zone]);
        setShowForm(false);
        setForm({ name: '', city: '', district: '', description: '', baseFee: '', perKmFee: '0', maxDistanceKm: '', estimatedTime: '', currency: 'SDG', sortOrder: '0' });
      } else {
        setError(res.error);
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      const res = await updateDeliveryZoneAction(id, { isActive: !isActive });
      if (res.success) {
        setZones((prev) => prev.map((z) => (z.id === id ? { ...z, isActive: !isActive } : z)));
      }
    });
  }

  async function handleDelete(id: string) {
    const ok = await confirmDialog({ message: t.confirmDelete, confirmLabel: t.delete, danger: true });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteDeliveryZoneAction(id);
      if (res.success) setZones((prev) => prev.filter((z) => z.id !== id));
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--muted-foreground)]">{zones.length} {t.zonesSuffix}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {t.addZone}
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="font-medium text-[var(--foreground)]">{t.empty}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t.emptySubtitle}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`rounded-xl border bg-[var(--card)] p-5 transition-opacity ${zone.isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[var(--foreground)]">{zone.name}</h3>
                  {(zone.city || zone.district) && <p className="mt-1 text-xs text-[var(--muted-foreground)]">المدينة: {zone.city || "غير مسجلة"} · الحي: {zone.district || "غير مسجل"}</p>}
                  {zone.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{zone.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mr-2 ${zone.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                  {zone.isActive ? t.active : t.disabled}
                </span>
              </div>

              <div className="space-y-2 text-sm border-t border-[var(--border)] pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">{t.baseFee}</span>
                  <span className="font-mono font-bold text-[var(--foreground)]">
                    {Number(zone.baseFee).toFixed(2)} {zone.currency}
                  </span>
                </div>
                {Number(zone.perKmFee) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t.perKmFee}</span>
                    <span className="font-mono text-[var(--foreground)]">
                      {Number(zone.perKmFee).toFixed(2)} {zone.currency}
                    </span>
                  </div>
                )}
                {zone.maxDistanceKm != null && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t.maxDistance}</span>
                    <span className="font-mono text-[var(--foreground)]">{zone.maxDistanceKm} {t.kmUnit}</span>
                  </div>
                )}
                {zone.estimatedTime && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t.deliveryTime}</span>
                    <span className="text-[var(--foreground)]">{zone.estimatedTime}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleToggle(zone.id, zone.isActive)}
                  disabled={isPending}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
                >
                  {zone.isActive ? t.disable : t.enable}
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--foreground)] mb-5">{t.modalTitle}</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.zoneNameLabel}</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  placeholder={t.zoneNamePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">المدينة<input required minLength={2} maxLength={120} list="zone-cities" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value, district: '' }))} className="mt-2 w-full rounded-lg border bg-[var(--background)] px-3 py-2.5" /><datalist id="zone-cities">{SUDAN_STATES.flatMap(state => state.cities).map(city => <option key={city.id} value={city.name} />)}</datalist></label>
                <label className="text-sm font-medium">الحي<input required minLength={2} maxLength={120} list="zone-districts" value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="mt-2 w-full rounded-lg border bg-[var(--background)] px-3 py-2.5" /><datalist id="zone-districts">{getSudanDistricts(SUDAN_STATES.flatMap(state => state.cities).find(city => city.name === form.city)?.id ?? '').map(d => <option key={d.id} value={d.name} />)}</datalist></label>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">اختر من الاقتراحات أو اكتب مدينة وحيًا غير مدرجين.</p>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.descriptionLabel}</label>
                <textarea rows={3} maxLength={500} value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  placeholder={t.descriptionPlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.baseFeeLabel}</label>
                  <input type="number" required step="0.01" min="0" value={form.baseFee}
                    onChange={(e) => setForm((p) => ({ ...p, baseFee: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.perKmFeeLabel}</label>
                  <input type="number" step="0.01" min="0" value={form.perKmFee}
                    onChange={(e) => setForm((p) => ({ ...p, perKmFee: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.maxDistanceLabel}</label>
                  <input type="number" step="0.1" min="0" value={form.maxDistanceKm}
                    onChange={(e) => setForm((p) => ({ ...p, maxDistanceKm: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder={t.maxDistanceOptional} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{t.deliveryTimeLabel}</label>
                  <input type="text" value={form.estimatedTime}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedTime: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder={t.deliveryTimePlaceholder} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending}
                  className="flex-1 rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {isPending ? t.saving : t.save}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
