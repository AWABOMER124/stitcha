import { StoreHeader } from "@/components/storefront/store-header";
import { StoreFooter } from "@/components/storefront/store-footer";

/**
 * Public storefront layout for individual merchant stores.
 * Completely separate from the dashboard — no auth required.
 */
export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // In production, fetch merchant data by slug here
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
    </div>
  );
}
