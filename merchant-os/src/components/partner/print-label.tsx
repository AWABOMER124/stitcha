'use client';
export function PrintShipmentLabel({ label = 'طباعة البوليصة' }: { label?: string }) { return <button onClick={() => window.print()} className="rounded-xl border px-5 py-3 print:hidden">{label}</button>; }
export const PrintSandboxLabel = PrintShipmentLabel;
