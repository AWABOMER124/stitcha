'use client';

import { useState } from 'react';

export function CopyStoreLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, link is still shown via the anchor.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:inline text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] truncate max-w-[200px]"
      >
        {url}
      </a>
      <button
        onClick={handleCopy}
        className="whitespace-nowrap rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary)]/90 transition-colors"
      >
        {copied ? '✓ تم النسخ' : 'نسخ رابط المتجر'}
      </button>
    </div>
  );
}
