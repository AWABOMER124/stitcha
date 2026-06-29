/**
 * Inventory management page — stock levels and movement tracking
 */
export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Inventory</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Track stock levels and manage inventory</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total Products Tracked</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">25</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">Low Stock</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">3</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Out of Stock</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">1</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">In Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Reserved</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {[
              { name: "شاورما دجاج", quantity: 45, reserved: 3, threshold: 10, status: "ok" },
              { name: "برجر لحم", quantity: 30, reserved: 2, threshold: 10, status: "ok" },
              { name: "عصير مانجو", quantity: 8, reserved: 0, threshold: 10, status: "low" },
              { name: "كيك شوكولاتة", quantity: 2, reserved: 1, threshold: 5, status: "low" },
              { name: "فتة", quantity: 0, reserved: 0, threshold: 5, status: "out" },
            ].map((item, i) => (
              <tr key={i} className="transition-colors hover:bg-[var(--muted)]/30">
                <td className="px-6 py-4 text-sm font-medium text-[var(--foreground)]">{item.name}</td>
                <td className="px-6 py-4 text-sm text-[var(--foreground)]">{item.quantity}</td>
                <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">{item.reserved}</td>
                <td className="px-6 py-4 text-sm text-[var(--muted-foreground)]">{item.threshold}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === "ok" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                    item.status === "low" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}>
                    {item.status === "ok" ? "In Stock" : item.status === "low" ? "Low Stock" : "Out of Stock"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-[var(--primary)] hover:underline">Adjust</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
