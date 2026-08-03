'use client';

import { useState, useTransition } from 'react';
import { createApiKeyAction, revokeApiKeyAction, listApiKeysAction } from '@/modules/agent-integration/actions';
import { useLocale } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | Date | null;
  revokedAt: string | Date | null;
  createdAt: string | Date;
}

const ALL_SCOPES = ['stores:draft', 'merchants:read', 'orders:read'] as const;

export function ApiKeysClient({ initialKeys }: { initialKeys: ApiKeyListItem[] }) {
  const { dict, locale } = useLocale();
  const t = dict.distributorApiKeys;
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [keys, setKeys] = useState(initialKeys);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const scopeLabels: Record<(typeof ALL_SCOPES)[number], string> = {
    'stores:draft': t.scopeStoresDraft,
    'merchants:read': t.scopeMerchantsRead,
    'orders:read': t.scopeOrdersRead,
  };

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  function resetForm() {
    setShowForm(false);
    setName('');
    setScopes([]);
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await createApiKeyAction({ name, scopes: scopes as (typeof ALL_SCOPES)[number][] });
      if (!res.success) {
        setError(res.error);
        return;
      }
      resetForm();
      setRevealedKey(res.data.key);
      toast.success(t.createdToast);

      const refreshed = await listApiKeysAction();
      if (refreshed.success) setKeys(refreshed.data as ApiKeyListItem[]);
    });
  }

  async function handleRevoke(key: ApiKeyListItem) {
    const ok = await confirmDialog({
      title: t.revokeConfirmTitle,
      message: t.revokeConfirmBody.replace('{name}', key.name),
      confirmLabel: t.revoke,
      danger: true,
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await revokeApiKeyAction(key.id);
      if (res.success) {
        setKeys((prev) => prev.map((k) => (k.id === key.id ? { ...k, revokedAt: new Date() } : k)));
        toast.success(t.revokedToast);
      } else {
        toast.error(res.error);
      }
    });
  }

  function copyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t.subtitle}</p>
      </div>

      {revealedKey && (
        <div className="rounded-xl border-2 border-[var(--primary)] bg-[var(--card)] p-5">
          <h3 className="font-bold text-[var(--foreground)]">{t.revealTitle}</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{t.revealHint}</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm text-[var(--foreground)]" dir="ltr">
              {revealedKey}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey} className="shrink-0">
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <Button className="mt-3" onClick={() => setRevealedKey(null)}>
            {t.close}
          </Button>
        </div>
      )}

      <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
        {showForm ? t.cancel : t.newKeyButton}
      </Button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t.formName}</Label>
              <Input
                type="text" required
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t.formNamePlaceholder}
                className="max-w-sm"
              />
            </div>
            <div>
              <Label className="mb-2">{t.formScopes}</Label>
              <div className="flex flex-col gap-2">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
                    {scopeLabels[scope]}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isPending || scopes.length === 0}>
              {isPending ? t.creating : t.create}
            </Button>
          </form>
        </div>
      )}

      {keys.length === 0 && !showForm ? (
        <EmptyState icon="🔑" title={t.empty} />
      ) : keys.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-start text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-3 text-start font-medium">{t.colName}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colScopes}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colLastUsed}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colCreated}</th>
                <th className="px-4 py-3 text-start font-medium">{t.colStatus}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const revoked = Boolean(key.revokedAt);
                return (
                  <tr key={key.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--foreground)]">{key.name}</div>
                      <code className="text-xs text-[var(--muted-foreground)]" dir="ltr">{key.keyPrefix}…</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s}>{scopeLabels[s as (typeof ALL_SCOPES)[number]] ?? s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString(locale) : t.never}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(key.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={revoked ? 'muted' : 'success'}>
                        {revoked ? t.statusRevoked : t.statusActive}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {!revoked && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleRevoke(key)}
                          disabled={isPending}
                          className="text-red-600 hover:bg-red-50"
                        >
                          {t.revoke}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
