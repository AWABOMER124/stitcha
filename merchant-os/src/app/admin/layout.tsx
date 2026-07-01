import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'PLATFORM_OWNER') redirect('/dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
