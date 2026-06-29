import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import Link from 'next/link';
import { NewDriverClient } from './_client';

export default async function NewDriverPage() {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  return (
    <div dir="rtl" className="max-w-xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
          <Link href="/distributor/drivers" className="hover:text-[var(--primary)]">
            السائقون
          </Link>
          <span>/</span>
          <span>إضافة سائق جديد</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">إضافة سائق جديد</h1>
      </div>
      <NewDriverClient />
    </div>
  );
}
