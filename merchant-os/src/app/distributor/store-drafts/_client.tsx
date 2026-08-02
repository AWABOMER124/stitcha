'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { approveStoreDraftAction, rejectStoreDraftAction } from '@/modules/agent-integration/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';

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

const STATUS_STYLES: Record<StoreDraftListItem['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
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
        <button
          onClick={() => setMode('approve')}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t.approveButton}
        </button>
        <button
          onClick={() => setMode('reject')}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          {t.rejectButton}
        </button>
      </div>
    );
  }

  if (mode === 'approve') {
    return (
      <form onSubmit={submitApprove} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.phoneLabel}</label>
            <input
              type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.addressLabel}</label>
            <input
              type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder={t.addressPlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit" disabled={isPending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? t.submitting : t.submitApprove}
          </button>
          <button type="button" onClick={() => setMode(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
            {t.cancel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitReject} className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">{t.reasonLabel}</label>
        <input
          type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={t.reasonPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit" disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? t.submitting : t.submitReject}
        </button>
        <button type="button" onClick={() => setMode(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
          {t.cancel}
        </button>
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
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🤖</p>
          <p className="font-semibold text-[var(--foreground)]">{t.empty}</p>
        </div>
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[draft.status]}`}>
                        {statusLabel[draft.status]}
                      </span>
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
