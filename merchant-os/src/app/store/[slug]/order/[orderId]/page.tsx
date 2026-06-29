/**
 * Order tracking page — public page for customers to track their order
 */
export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { orderId } = await params;

  // TODO: Fetch real order data from storefront service
  const order = {
    orderNumber: "ORD-0024",
    status: "PREPARING",
    customerName: "Ahmed Mohammed",
    items: [
      { name: "شاورما دجاج", qty: 2, price: 250 },
      { name: "عصير مانجو", qty: 1, price: 80 },
    ],
    subtotal: 580,
    deliveryFee: 50,
    total: 630,
    deliveryMethod: "MERCHANT_DELIVERY",
    createdAt: "2024-01-15 14:30",
  };

  const steps = [
    { key: "NEW", label: "Order Placed", icon: "📋" },
    { key: "ACCEPTED", label: "Accepted", icon: "✅" },
    { key: "PREPARING", label: "Preparing", icon: "👨‍🍳" },
    { key: "READY", label: "Ready", icon: "📦" },
    { key: "OUT_FOR_DELIVERY", label: "On the Way", icon: "🚚" },
    { key: "DELIVERED", label: "Delivered", icon: "🎉" },
  ];

  const statusOrder = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];
  const currentIndex = statusOrder.indexOf(order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Order {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Placed at {order.createdAt}
        </p>
      </div>

      {/* Status Timeline */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const isDone = i <= currentIndex;
            const isCurrent = i === currentIndex;

            return (
              <div key={step.key} className="flex flex-col items-center relative">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all ${
                  isCurrent
                    ? "bg-red-700 text-white shadow-lg shadow-red-700/30 scale-110"
                    : isDone
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-400"
                }`}>
                  {step.icon}
                </div>
                <span className={`mt-2 text-[10px] font-medium text-center max-w-[60px] ${
                  isCurrent ? "text-red-700 dark:text-red-400" : isDone ? "text-emerald-700 dark:text-emerald-400" : "text-stone-400"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="mt-10 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="border-b border-stone-200 dark:border-stone-800 px-6 py-4">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Order Items</h2>
        </div>
        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                <p className="text-xs text-stone-500">x{item.qty}</p>
              </div>
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.price * item.qty} SDG</p>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 px-6 py-4 space-y-2">
          <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400">
            <span>Subtotal</span><span>{order.subtotal} SDG</span>
          </div>
          <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400">
            <span>Delivery Fee</span><span>{order.deliveryFee} SDG</span>
          </div>
          <div className="flex justify-between text-base font-bold text-stone-900 dark:text-stone-100">
            <span>Total</span><span>{order.total} SDG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
