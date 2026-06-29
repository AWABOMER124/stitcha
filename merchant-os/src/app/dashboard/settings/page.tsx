/** Settings page */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Configure your store and storefront</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Store Profile", desc: "Business name, logo, contact info", icon: "🏪" },
          { title: "Storefront", desc: "Theme, banner, working hours", icon: "🌐" },
          { title: "Delivery Zones", desc: "Delivery areas and fees", icon: "🗺️" },
          { title: "Payment Methods", desc: "Accepted payment options", icon: "💳" },
          { title: "Notifications", desc: "Alert preferences and channels", icon: "🔔" },
          { title: "Team & Roles", desc: "Staff permissions and access", icon: "👥" },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md cursor-pointer">
            <div className="flex items-start gap-4">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
