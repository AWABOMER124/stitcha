export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-white to-red-50 dark:from-stone-950 dark:via-stone-900 dark:to-red-950/20">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
