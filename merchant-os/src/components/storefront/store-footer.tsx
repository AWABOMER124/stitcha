/**
 * Storefront footer
 */
export function StoreFooter() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-700 text-white text-xs font-bold">
              و
            </div>
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Powered by Waslak
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-500">
            © {new Date().getFullYear()} Waslak Merchant OS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
