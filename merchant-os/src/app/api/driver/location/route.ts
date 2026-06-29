import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { driverId, lat, lng, speed, bearing, accuracy } = body as {
      driverId?: string;
      lat?: number;
      lng?: number;
      speed?: number;
      bearing?: number;
      accuracy?: number;
    };

    if (!driverId || lat == null || lng == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, isActive: true },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.driver.update({
        where: { id: driverId },
        data: { currentLat: lat, currentLng: lng, lastSeenAt: new Date(), status: 'ONLINE' },
      }),
      prisma.driverLocationLog.create({
        data: {
          driverId,
          lat,
          lng,
          speed: speed ?? null,
          bearing: bearing ?? null,
          accuracy: accuracy ?? null,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
