import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createPendingMerchantWithInvite } from '@/modules/merchants/services/merchant-invite.service';

/**
 * Distributor "Add Merchant" — invite-by-link flow. Only collects the
 * basics (store name, phone, location); the merchant completes the rest of
 * their own registration (owner name, password, business type) by following
 * a unique link sent to this phone number via WhatsApp.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.distributorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const distributorId = session.user.distributorId;
  const role = session.user.role;
  if (role !== 'DISTRIBUTOR_OWNER' && role !== 'DISTRIBUTOR_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, address } = body;

  if (!name || !phone || !address) {
    return NextResponse.json({ error: 'Store name, phone, and location are required' }, { status: 400 });
  }

  const merchant = await createPendingMerchantWithInvite({ name, phone, address, distributorId });

  return NextResponse.json({ id: merchant.id, slug: merchant.slug }, { status: 201 });
}
