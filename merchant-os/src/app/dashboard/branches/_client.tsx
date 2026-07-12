'use client';

import { useState, useTransition } from 'react';
import { createBranchAction, updateBranchAction, deleteBranchAction, setMainBranchAction } from '@/modules/branches/actions';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  isActive: boolean;
}

export function BranchesClient({ initialBranches }: { initialBranches: Branch[] }) {
  const [branches, setBranches] = useState(initialBranches);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', address: '', phone: '' });
    setError('');
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '' });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const payload = { name: form.name, address: form.address || undefined, phone: form.phone || undefined };
      if (editingId) {
        const res = await updateBranchAction(editingId, payload);
        if (res.success) {
          const updated = res.data as unknown as Branch;
          setBranches((b) => b.map((x) => (x.id === editingId ? { ...x, ...updated } : x)));
          resetForm();
        } else setError(res.error);
      } else {
        const res = await createBranchAction(payload);
        if (res.success) {
          const created = res.data as unknown as Branch;
          setBranches((b) => [...b, created]);
          resetForm();
        } else setError(res.error);
      }
    });
  }

  function handleSetMain(id: string) {
    startTransition(async () => {
      const res = await setMainBranchAction(id);
      if (res.success) {
        setBranches((b) => b.map((x) => ({ ...x, isMain: x.id === id })));
      }
    });
  }

  function handleDelete(b: Branch) {
    if (b.isMain) { alert('Cannot delete the main branch'); return; }
    if (!confirm(`Delete "${b.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteBranchAction(b.id);
      if (res.success) setBranches((prev) => prev.filter((x) => x.id !== b.id));
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => (showForm ? resetForm() : setShowForm(true))}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90 transition-colors"
      >
        {showForm ? 'Cancel' : <>+ Add Branch</>}
      </button>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-4">{editingId ? 'Edit branch' : 'New branch'}</h3>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1.5">Address</label>
              <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={isPending}
                className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                {isPending ? 'Saving...' : editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {branches.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-16 text-center">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-semibold text-[var(--foreground)]">No branches yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Add your first branch/location</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{b.name}</h3>
                    {b.isMain && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Main</span>}
                  </div>
                  {b.address && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{b.address}</p>}
                  {b.phone && <p className="text-xs text-[var(--muted-foreground)]">{b.phone}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3">
                <button onClick={() => startEdit(b)} className="text-xs font-medium text-[var(--foreground)] hover:underline">
                  Edit
                </button>
                {!b.isMain && (
                  <button onClick={() => handleSetMain(b.id)} disabled={isPending}
                    className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50">
                    Set as main
                  </button>
                )}
                <button onClick={() => handleDelete(b)} disabled={isPending}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
