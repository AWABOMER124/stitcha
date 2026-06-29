/** Staff management page */
export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Staff</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage team members and permissions</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm">
          <span>+</span> Invite Staff
        </button>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-4xl">👤</p>
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Team Management</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Invite team members, assign roles, and manage permissions</p>
      </div>
    </div>
  );
}
