'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { approveStoreDraftAction, rejectStoreDraftAction } from '@/modules/agent-integration/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';

interface DraftCategory {
  name: string;
  products: { name: string; price: number; description?: string }[];
}

export interface StoreDraftListItem {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  categories: DraftCategory[];
  merchantId: string | null;
  rejectionReason: string | null;
  createdAt: string | Date;
  apiKey?: { name: string } | null;
}

const STATUS_VARIANT: Record<StoreDraftListItem['status'], 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

function DraftReviewForm({ draft, onDone }: { draft: StoreDraftListItem; onDone: (updated: Partial<StoreDraftListItem>) => void }) {
  const { dict } = useLocale();
  const t = dict.distributorStoreDrafts;
  const toast = useToast();
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function submitApprove(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await approveStoreDraftAction(draft.id, { phone, address });
      if (res.success) {
        toast.success(t.approvedToast);
        onDone({ status: 'APPROVED', merchantId: res.data.id });
      } else {
        setError(res.error);
      }
    });
  }

  function submitReject(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await rejectStoreDraftAction(draft.id, reason || undefined);
      if (res.success) {
        toast.success(t.rejectedToast);
        onDone({ status: 'REJECTED', rejectionReason: reason || null });
      } else {
        setError(res.error);
      }
    });
  }

  if (mode === null) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode('approve')}>
          {t.approveButton}
        </Button>
        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => setMode('reject')}>
          {t.rejectButton}
        </Button>
      </div>
    );
  }

  if (mode === 'approve') {
    return (
      <form onSubmit={submitApprove} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>{t.phoneLabel}</Label>
            <Input
              type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
            />
          </div>
          <div>
            <Label>{t.addressLabel}</Label>
            <Input
              type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder={t.addressPlaceholder}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t.submitting : t.submitApprove}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>
            {t.cancel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitReject} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
      <div>
        <Label>{t.reasonLabel}</Label>
        <Input
          type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={t.reasonPlaceholder}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
          {isPending ? t.submitting : t.submitReject}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

export function StoreDraftsClient({ initialDrafts }: { initialDrafts: StoreDraftListItem[] }) {
  const { dict, locale } = useLocale();
  const t = dict.distributorStoreDrafts;
  const [drafts, setDrafts] = useState(initialDrafts);

  const statusLabel: Record<StoreDraftListItem['status'], string> = {
    PENDING: t.statusPending,
    APPROVED: t.statusApproved,
    REJECTED: t.statusRejected,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      {drafts.length === 0 ? (
        <EmptyState icon="🤖" title={t.empty} />
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const totalProducts = draft.categories.reduce((sum, c) => sum + c.products.length, 0);
            return (
              <div key={draft.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--foreground)]">{draft.name}</h3>
                      <Badge variant={STATUS_VARIANT[draft.status]}>{statusLabel[draft.status]}</Badge>
                    </div>
                    {draft.description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{draft.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                    {new Date(draft.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>

                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  <span className="font-medium">{t.promptLabel}:</span> {draft.prompt}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  <span className="font-medium">{t.categoriesLabel}:</span>{' '}
                  {draft.categories.map((c) => c.name).join('، ')} · {t.productsCount.replace('{count}', String(totalProducts))}
                </p>
                {draft.apiKey && (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {t.submittedVia}: {draft.apiKey.name}
                  </p>
                )}

                <div className="mt-4">
                  {draft.status === 'PENDING' && (
                    <DraftReviewForm draft={draft} onDone={(updated) => setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, ...updated } : d)))} />
                  )}
                  {draft.status === 'APPROVED' && (
                    <div className="text-sm text-emerald-700">
                      {t.approvedNote}{' '}
                      {draft.merchantId && (
                        <Link href={`/distributor/merchants/${draft.merchantId}`} className="font-medium underline">
                          {t.viewMerchant}
                        </Link>
                      )}
                    </div>
                  )}
                  {draft.status === 'REJECTED' && (
                    <div className="text-sm text-red-700">
                      {t.rejectedNote}
                      {draft.rejectionReason ? `: ${draft.rejectionReason}` : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
