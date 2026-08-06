import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { driverLocationPingSchema } from '@/modules/drivers/schemas/drivers.schemas';
import * as driversService from '@/modules/drivers/services/drivers.service';

/**
 * Driver-side location ping. Authenticated by `Authorization: Bearer
 * <Driver.locationToken>` — a long-lived per-driver credential (see the
 * driver detail page in the distributor dashboard), never by a raw driverId
 * in the body. A raw driverId would let anyone who saw/guessed one spoof
 * that driver's location or mark them ONLINE.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const driver = await prisma.driver.findFirst({
      where: { locationToken: token, isActive: true },
      select: { id: true },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const parsed = driverLocationPingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }

    await driversService.updateLocation({ driverId: driver.id, ...parsed.data });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
