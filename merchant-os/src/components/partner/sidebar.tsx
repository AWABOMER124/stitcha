"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WaslaMark } from "@/components/brand/wasla-logo";

const links = [
  ["نظرة عامة", "/partner", "📊"],
  ["الشحنات", "/partner/shipments", "📦"],
  ["التغطية والأسعار", "/partner/coverage", "🗺️"],
  ["التطبيق والتكامل", "/partner/settings", "🔌"],
];
export function PartnerSidebar({ name }: { name: string }) {
  const path = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-[var(--border)] bg-[var(--card)] lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
        <WaslaMark />
        <div>
          <p className="text-sm font-black">شركاء وصلة</p>
          <p className="max-w-36 truncate text-[10px] text-[var(--muted-foreground)]">
            {name}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(([label, href, icon]) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${path === href ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--muted)]"}`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[var(--border)] p-4 text-xs leading-6 text-[var(--muted-foreground)]">
        بوابة إدارة تطبيق وخدمات التوصيل على وصلة.
      </div>
    </aside>
  );
}
