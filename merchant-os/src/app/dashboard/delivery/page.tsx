/** Delivery management page */
export default function DeliveryPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Delivery</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Manage deliveries and track shipments</p></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-4xl">🚚</p>
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Delivery Management</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Track deliveries, assign drivers, and manage delivery zones</p>
      </div>
    </div>
  );
}
