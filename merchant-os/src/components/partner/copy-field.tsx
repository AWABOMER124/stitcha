"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-600">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border bg-slate-50 p-2">
        <code dir="ltr" className="min-w-0 flex-1 break-all px-2 text-xs text-slate-700">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="grid size-10 shrink-0 place-items-center rounded-lg border bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
          aria-label={`نسخ ${label}`}
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      </div>
      {copied && <p role="status" className="mt-2 text-xs font-bold text-emerald-700">تم النسخ</p>}
    </div>
  );
}
