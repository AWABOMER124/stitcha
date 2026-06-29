/** Branches management page */
export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Branches</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage your store branches and locations</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm">
          <span>+</span> Add Branch
        </button>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-4xl">🏪</p>
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Branch Management</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Add and manage multiple store locations</p>
      </div>
    </div>
  );
}
