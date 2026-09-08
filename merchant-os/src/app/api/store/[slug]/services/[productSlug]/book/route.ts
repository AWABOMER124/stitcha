import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPublicBooking } from '@/modules/service-bookings/service-bookings.service';

const schema = z.object({
  customerName: z.string().trim().min(2).max(120), customerPhone: z.string().trim().min(7).max(32),
  startAt: z.string().datetime().optional(), branchId: z.string().cuid().optional(),
  participantCount: z.number().int().min(1).max(100).optional(), note: z.string().trim().max(500).optional(), customerAddress: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; productSlug: string }> }) {
  try {
    const { slug, productSlug } = await params;
    const data = schema.parse(await request.json());
    const result = await createPublicBooking(slug, productSlug, data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create service booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
