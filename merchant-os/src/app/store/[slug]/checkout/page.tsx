"use client";

/**
 * Checkout page — customer enters delivery info and places order
 */
export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Checkout</h1>

      <div className="mt-8 space-y-6">
        {/* Customer Info */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Contact Information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Name</label>
              <input type="text" className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
              <input type="tel" className="mt-1 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" placeholder="+249 912 345 678" />
            </div>
          </div>
        </div>

        {/* Delivery Method */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Delivery Method</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center gap-2 rounded-xl border-2 border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-sm font-medium text-red-700 dark:text-red-400">
              <span className="text-2xl">🏪</span>
              Pickup
            </button>
            <button className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-sm font-medium text-stone-600 dark:text-stone-400 hover:border-red-300">
              <span className="text-2xl">🚚</span>
              Delivery
            </button>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Payment Method</h2>
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 p-3 cursor-pointer hover:border-red-300">
              <input type="radio" name="payment" defaultChecked className="text-red-700" />
              <span className="text-sm">💵 Cash on Delivery</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 dark:border-stone-700 p-3 cursor-pointer hover:border-red-300 opacity-50">
              <input type="radio" name="payment" disabled />
              <span className="text-sm">💳 Card (Coming Soon)</span>
            </label>
          </div>
        </div>

        {/* Place Order Button */}
        <button className="w-full rounded-xl bg-red-700 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-700/25 transition-all hover:bg-red-800 active:scale-[0.98]">
          Place Order
        </button>
      </div>
    </div>
  );
}
