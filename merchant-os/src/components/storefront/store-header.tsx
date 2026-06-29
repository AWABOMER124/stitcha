"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * Storefront header — public store navigation bar
 */
export function StoreHeader() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Store Name */}
        <Link href={`/store/${slug}`} className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-700 text-white text-lg font-bold">
            و
          </div>
          <span className="text-lg font-bold text-stone-900 dark:text-stone-100">
            مطعم الشيف
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700"
            aria-label="Search"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Cart */}
          <Link
            href={`/store/${slug}/cart`}
            className="relative flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span>Cart</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-700">
              0
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
