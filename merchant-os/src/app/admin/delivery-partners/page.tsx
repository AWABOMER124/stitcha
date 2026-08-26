import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

async function updatePartner(formData: FormData) {
  'use server';
  const session = await auth();
  if (session?.user?.role !== 'PLATFORM_OWNER') redirect('/login');
  const id = String(formData.get('id') ?? '');
  const intent = String(formData.get('intent') ?? '');
  if (!id) return;
  if (intent === 'activate') await prisma.deliveryPartner.update({ where: { id }, data: { status: 'ACTIVE', isActive: true } });
  if (intent === 'suspend') await prisma.deliveryPartner.update({ where: { id }, data: { status: 'SUSPENDED', isActive: false } });
  if (intent === 'enable-cod') await prisma.deliveryPartner.update({ where: { id }, data: { supportsCod: true } });
  if (intent === 'disable-cod') await prisma.deliveryPartner.update({ where: { id }, data: { supportsCod: false } });
  revalidatePath('/admin/delivery-partners');
}

export default async function DeliveryPartnersPage() {
  const partners = await prisma.deliveryPartner.findMany({
    include: { _count: { select: { serviceAreas: true, couriers: true, shipments: true } } },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Delivery partners · شركاء التوصيل</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Review ownership and capabilities before activating live delivery.</p></header>
    <div className="grid gap-4 xl:grid-cols-2">
      {partners.map((partner) => <article key={partner.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{partner.name}</h2><p className="text-xs text-[var(--muted-foreground)]">{partner.phone ?? 'No phone'} · {partner.slug}</p></div><span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-semibold">{partner.status}</span></div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><div><dt className="text-[var(--muted-foreground)]">Areas</dt><dd className="font-bold">{partner._count.serviceAreas}</dd></div><div><dt className="text-[var(--muted-foreground)]">Couriers</dt><dd className="font-bold">{partner._count.couriers}</dd></div><div><dt className="text-[var(--muted-foreground)]">Shipments</dt><dd className="font-bold">{partner._count.shipments}</dd></div></dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={updatePartner}><input type="hidden" name="id" value={partner.id}/><input type="hidden" name="intent" value={partner.status === 'ACTIVE' ? 'suspend' : 'activate'}/><button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-white">{partner.status === 'ACTIVE' ? 'Suspend' : 'Approve'}</button></form>
          <form action={updatePartner}><input type="hidden" name="id" value={partner.id}/><input type="hidden" name="intent" value={partner.supportsCod ? 'disable-cod' : 'enable-cod'}/><button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">COD: {partner.supportsCod ? 'Enabled' : 'Disabled'}</button></form>
        </div>
      </article>)}
      {partners.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-[var(--muted-foreground)]">No delivery partners yet.</p>}
    </div>
  </div>;
}
