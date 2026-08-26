import { NextResponse } from 'next/server';

/** Distributor acquisition is permanently closed under the direct-merchant model. */
export async function POST() {
  return NextResponse.json(
    { error: 'Distributor registration has been retired. Create a free merchant store instead.' },
    { status: 410 },
  );
}
