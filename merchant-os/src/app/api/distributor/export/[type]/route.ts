import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import prisma from '@/lib/db/prisma';

const MAX_ROWS = 5000;

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await auth();
  if (!session?.user?.distributorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const distributorId = session.user.distributorId;

  const { type } = await params;

  if (type === 'merchants') {
    const merchants = await prisma.merchant.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: { name: true, slug: true, phone: true, email: true, storeType: true, status: true, createdAt: true },
    });
    const csv = toCsv(
      merchants.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      ['name', 'slug', 'phone', 'email', 'storeType', 'status', 'createdAt']
    );
    return csvResponse(csv, 'merchants.csv');
  }

  if (type === 'drivers') {
    const drivers = await prisma.driver.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: { name: true, phone: true, vehicleType: true, vehiclePlate: true, status: true, isActive: true, totalDeliveries: true, createdAt: true },
    });
    const csv = toCsv(
      drivers.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      ['name', 'phone', 'vehicleType', 'vehiclePlate', 'status', 'isActive', 'totalDeliveries', 'createdAt']
    );
    return csvResponse(csv, 'drivers.csv');
  }

  if (type === 'orders') {
    const orders = await prisma.order.findMany({
      where: { merchant: { distributorId } },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: {
        orderNumber: true,
        status: true,
        customerName: true,
        customerPhone: true,
        total: true,
        createdAt: true,
        merchant: { select: { name: true } },
      },
    });
    const csv = toCsv(
      orders.map((o) => ({
        orderNumber: o.orderNumber,
        merchant: o.merchant.name,
        status: o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        total: o.total.toString(),
        createdAt: o.createdAt.toISOString(),
      })),
      ['orderNumber', 'merchant', 'status', 'customerName', 'customerPhone', 'total', 'createdAt']
    );
    return csvResponse(csv, 'orders.csv');
  }

  return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
}
