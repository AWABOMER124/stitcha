"use client";

/**
 * Cart page — shows items in cart with checkout option
 */
export default function CartPage() {
  // TODO: Implement cart state with React context or zustand
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Your Cart</h1>

      {/* Empty cart state */}
      <div className="mt-12 text-center">
        <span className="text-6xl">🛒</span>
        <h2 className="mt-4 text-lg font-semibold text-stone-700 dark:text-stone-300">
          Your cart is empty
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Add items from the menu to get started
        </p>
        <a
          href="./"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-700 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-red-800"
        >
          ← Browse Menu
        </a>
      </div>
    </div>
  );
}
