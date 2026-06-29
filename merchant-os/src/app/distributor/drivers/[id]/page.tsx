import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDriverAction } from '@/modules/drivers/actions';
import { DRIVER_STATUS_CONFIG, VEHICLE_LABELS } from '@/modules/drivers/types';
import Link from 'next/link';
import { DriverProfileClient } from './_client';

export default async function DriverProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) redirect('/login');

  const { id } = await params;
  const result = await getDriverAction(id);
  if (!result.success) notFound();

  const driver = result.data as any;
  const statusCfg = DRIVER_STATUS_CONFIG[driver.status as keyof typeof DRIVER_STATUS_CONFIG];

  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/distributor/drivers" className="hover:text-[var(--primary)]">
          السائقون
        </Link>
        <span>/</span>
        <span>{driver.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-3xl font-black text-[var(--primary)] mx-auto">
              {driver.name.charAt(0)}
            </div>
            <div
              className={`absolute bottom-0 left-0 w-5 h-5 rounded-full border-2 border-[var(--card)] ${statusCfg?.dot ?? 'bg-stone-400'}`}
            />
          </div>
          <h2 className="text-xl font-black text-[var(--foreground)]">{driver.name}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{driver.phone}</p>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusCfg?.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusCfg?.dot}`} />
            {statusCfg?.label}
          </span>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center border-t border-[var(--border)] pt-5">
            <div>
              <p className="text-2xl font-black text-[var(--foreground)]">{driver._count?.assignments ?? 0}</p>
              <p className="text-xs text-[var(--muted-foreground)]">إجمالي التوصيلات</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-500">{Number(driver.rating).toFixed(1)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">التقييم</p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-right border-t border-[var(--border)] pt-5">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">المركبة</span>
              <span className="font-medium">
                {VEHICLE_LABELS[driver.vehicleType as keyof typeof VEHICLE_LABELS]}
              </span>
            </div>
            {driver.vehiclePlate && (
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">اللوحة</span>
                <span className="font-mono font-bold">{driver.vehiclePlate}</span>
              </div>
            )}
            {driver.nationalId && (
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">الرقم الوطني</span>
                <span className="font-mono">{driver.nationalId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">الحالة</span>
              <span className={`font-medium ${driver.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                {driver.isActive ? 'نشط' : 'موقوف'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">التحقق</span>
              <span className={driver.isVerified ? 'text-blue-600 font-medium' : 'text-[var(--muted-foreground)]'}>
                {driver.isVerified ? '✓ موثق' : 'غير موثق'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <DriverProfileClient driver={driver} />
        </div>
      </div>
    </div>
  );
}
