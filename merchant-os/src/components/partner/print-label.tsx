'use client';
export function PrintSandboxLabel() { return <button onClick={() => window.print()} className="rounded-xl border px-5 py-3 print:hidden">طباعة البوليصة</button>; }
