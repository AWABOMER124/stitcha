"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Cable, FlaskConical, LayoutDashboard, MapPinned, PackageCheck, ShieldCheck } from "lucide-react";
import { WaslaMark } from "@/components/brand/wasla-logo";

const groups = [
  { label: "التشغيل", links: [
    { label: "نظرة عامة", href: "/partner", icon: LayoutDashboard },
    { label: "الشحنات", href: "/partner/shipments", icon: PackageCheck },
    { label: "التغطية والأسعار", href: "/partner/coverage", icon: MapPinned },
  ] },
  { label: "التطوير والإطلاق", links: [
    { label: "التطبيق والتكامل", href: "/partner/settings", icon: Cable },
    { label: "دليل الربط وAPI", href: "/partner/docs", icon: BookOpenText },
    { label: "بيئة الاختبار", href: "/partner/sandbox", icon: FlaskConical },
  ] },
  { label: "الحساب", links: [
    { label: "الأمان والتحقق", href: "/partner/security", icon: ShieldCheck },
  ] },
];

export function PartnerSidebar({ name, status }: { name: string; status: string }) {
  const path = usePathname();
  return <aside className="hidden w-72 shrink-0 flex-col border-e border-white/10 bg-[#07111f] text-white lg:flex">
    <div className="flex min-h-20 items-center gap-3 border-b border-white/10 px-6">
      <span className="grid size-10 place-items-center rounded-xl bg-white"><WaslaMark /></span>
      <div className="min-w-0"><p className="text-sm font-black">بوابة شركاء وصلة</p><p className="mt-1 truncate text-xs text-slate-400">{name}</p></div>
    </div>
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6" aria-label="التنقل الرئيسي للشريك">
      {groups.map(group => <section key={group.label}>
        <p className="mb-2 px-3 text-[11px] font-bold text-slate-500">{group.label}</p>
        <div className="space-y-1">{group.links.map(({ label, href, icon: Icon }) => {
          const active = href === '/partner' ? path === href : path.startsWith(href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-[#13c4a3] text-[#07111f]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} /><span>{label}</span>
          </Link>;
        })}</div>
      </section>)}
    </nav>
    <div className="border-t border-white/10 p-4"><div className="rounded-xl bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs font-bold"><span className={`size-2 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />{status === 'ACTIVE' ? 'حساب شريك نشط' : 'الحساب قيد المراجعة'}</div>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">إدارة التطبيق، الربط التشغيلي، التغطية والشحنات من مكان واحد.</p>
    </div></div>
  </aside>;
}
