'use client';

import { useState, useTransition } from 'react';
import { createFeaturedPlacementAction, removeFeaturedPlacementAction } from '@/modules/featured-placements/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';

export interface MerchantOption {
  id: string;
  name: string;
}

export interface PlacementListItem {
  id: string;
  merchantId: string;
  merchant: { id: string; name: string; slug: string };
  startsAt: string | Date;
  endsAt: string | Date;
  amount: number | string;
  currency: string;
  notes: string | null;
  isActive: boolean;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function FeaturedPlacementsClient({
  initialPlacements,
  merchants,
}: {
  initialPlacements: PlacementListItem[];
  merchants: MerchantOption[];
}) {
  const { dict, locale } = useLocale();
  const t = dict.distributorFeaturedPlacements;
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [placements, setPlacements] = useState(initialPlacements);
  const [showForm, setShowForm] = useState(false);
  const [merchantId, setMerchantId] = useState(merchants[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState(todayIso());
  const [endsAt, setEndsAt] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setShowForm(false);
    setAmount('');
    setNotes('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createFeaturedPlacementAction({
        merchantId,
        startsAt,
        endsAt,
        amount: Number(amount),
        notes: notes || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      resetForm();
      toast.success(t.createdToast);
      setPlacements((prev) => [res.data as PlacementListItem, ...prev]);
    });
  }

  async function handleRemove(p: PlacementListItem) {
    const ok = await confirmDialog({
      title: t.removeConfirmTitle,
      message: t.removeConfirmBody.replace('{name}', p.merchant.name),
      confirmLabel: t.remove,
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await removeFeaturedPlacementAction(p.id);
      if (res.success) {
        setPlacements((prev) => prev.filter((x) => x.id !== p.id));
        toast.success(t.removedToast);
      } else {
        toast.error(res.error);
      }
    });
  }

  function statusFor(p: PlacementListItem): { label: string; variant: 'success' | 'warning' | 'muted' } {
    const now = new Date();
    if (p.isActive) return { label: t.statusActive, variant: 'success' };
    if (new Date(p.startsAt) > now) return { label: t.statusScheduled, variant: 'warning' };
    return { label: t.statusExpired, variant: 'muted' };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <Button onClick={() => (showForm ? resetForm() : setShowForm(true))} disabled={merchants.length === 0}>
        {showForm ? t.cancel : t.newPlacementButton}
      </Button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>{t.formMerchant}</Label>
              <select
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                required
                className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/30"
              >
                <option value="" disabled>{t.formMerchantPlaceholder}</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t.formStartsAt}</Label>
              <Input type="date" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>{t.formEndsAt}</Label>
              <Input type="date" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div>
              <Label>{t.formAmount}</Label>
              <Input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t.formNotes}</Label>
              <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? t.creating : t.create}
              </Button>
            </div>
          </form>
        </div>
      )}

      {placements.length === 0 ? (
        <EmptyState icon="⭐" title={t.empty} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-3 text-start font-medium">{t.colMerchant}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colPeriod}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colAmount}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colStatus}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => {
                const status = statusFor(p);
                return (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{p.merchant.name}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(p.startsAt).toLocaleDateString(locale)} — {new Date(p.endsAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{Number(p.amount).toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="px-4 py-3 text-end">
                      <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => handleRemove(p)}>
                        {t.remove}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
