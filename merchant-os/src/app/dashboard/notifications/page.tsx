/** Notifications page */
export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Notifications</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Stay updated on orders, stock, and system events</p></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-4xl">🔔</p>
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Notification Center</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Order alerts, stock alerts, and system notifications</p>
      </div>
    </div>
  );
}
