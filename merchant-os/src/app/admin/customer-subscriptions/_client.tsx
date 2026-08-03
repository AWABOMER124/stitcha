'use client';

import { useState, useTransition } from 'react';
import { grantCustomerSubscriptionAction, cancelCustomerSubscriptionAction } from '@/modules/customer-subscriptions/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';

export interface SubscriptionListItem {
  id: string;
  customerAccount: { id: string; name: string; phone: string };
  startsAt: string | Date;
  endsAt: string | Date;
  status: 'ACTIVE' | 'CANCELLED';
  isActive: boolean;
  notes: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CustomerSubscriptionsClient({ initialSubscriptions }: { initialSubscriptions: SubscriptionListItem[] }) {
  const { dict, locale } = useLocale();
  const t = dict.adminCustomerSubscriptions;
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [subs, setSubs] = useState(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [startsAt, setStartsAt] = useState(todayIso());
  const [endsAt, setEndsAt] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setShowForm(false);
    setPhone('');
    setNotes('');
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await grantCustomerSubscriptionAction({
        customerPhone: phone,
        startsAt,
        endsAt,
        notes: notes || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      resetForm();
      toast.success(t.grantedToast);
      setSubs((prev) => [res.data as SubscriptionListItem, ...prev]);
    });
  }

  async function handleCancel(s: SubscriptionListItem) {
    const ok = await confirmDialog({
      title: t.cancelConfirmTitle,
      message: t.cancelConfirmBody.replace('{name}', s.customerAccount.name),
      confirmLabel: t.cancelSubscription,
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await cancelCustomerSubscriptionAction(s.id);
      if (res.success) {
        setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: 'CANCELLED', isActive: false } : x)));
        toast.success(t.cancelledToast);
      } else {
        toast.error(res.error);
      }
    });
  }

  function statusFor(s: SubscriptionListItem): { label: string; variant: 'success' | 'warning' | 'muted' } {
    if (s.status === 'CANCELLED') return { label: t.statusCancelled, variant: 'muted' };
    if (s.isActive) return { label: t.statusActive, variant: 'success' };
    if (new Date(s.startsAt) > new Date()) return { label: t.statusScheduled, variant: 'warning' };
    return { label: t.statusExpired, variant: 'muted' };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
        {showForm ? t.cancel : t.newSubscriptionButton}
      </Button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>{t.formPhone}</Label>
              <Input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.formPhonePlaceholder} className="max-w-sm" />
            </div>
            <div>
              <Label>{t.formStartsAt}</Label>
              <Input type="date" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>{t.formEndsAt}</Label>
              <Input type="date" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t.formNotes}</Label>
              <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? t.granting : t.grant}
              </Button>
            </div>
          </form>
        </div>
      )}

      {subs.length === 0 ? (
        <EmptyState icon="⭐" title={t.empty} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-3 text-start font-medium">{t.colCustomer}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colPhone}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colPeriod}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colStatus}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const status = statusFor(s);
                return (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{s.customerAccount.name}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]" dir="ltr">{s.customerAccount.phone}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(s.startsAt).toLocaleDateString(locale)} — {new Date(s.endsAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="px-4 py-3 text-end">
                      {s.status === 'ACTIVE' && (
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" disabled={isPending} onClick={() => handleCancel(s)}>
                          {t.cancelSubscription}
                        </Button>
                      )}
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
