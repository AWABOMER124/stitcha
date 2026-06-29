/** Reports page */
export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Sales analytics and business insights</p></div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
        <p className="text-4xl">📈</p>
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">Reports & Analytics</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sales reports, top products, revenue analytics, and more</p>
      </div>
    </div>
  );
}
