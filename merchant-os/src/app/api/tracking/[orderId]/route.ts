import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireCustomerAuth } from '@/lib/auth/customer-session';
import { appError } from '@/lib/http/app-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  let orderId: string;
  let initialStatus: string;

  try {
    ({ orderId } = await params);
    const account = await requireCustomerAuth(req);
    const order = await prisma.order.findFirst({
      where: { id: orderId, customer: { accountId: account.id } },
      select: { status: true },
    });

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    initialStatus = order.status;
  } catch (err) {
    return appError(err);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(data: object) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      function close() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      try {
        send({ type: 'ORDER_STATUS', status: initialStatus });

        const interval = setInterval(async () => {
          try {
            const [updatedOrder, assignment] = await Promise.all([
              prisma.order.findUnique({
                where: { id: orderId },
                select: { status: true, updatedAt: true },
              }),
              prisma.driverAssignment.findUnique({
                where: { orderId },
                include: {
                  driver: {
                    select: { currentLat: true, currentLng: true, name: true, phone: true },
                  },
                },
              }),
            ]);

            if (!updatedOrder) {
              clearInterval(interval);
              close();
              return;
            }

            send({ type: 'ORDER_STATUS', status: updatedOrder.status });

            if (assignment?.driver?.currentLat && assignment.driver.currentLng) {
              send({
                type: 'DRIVER_LOCATION',
                lat: assignment.driver.currentLat,
                lng: assignment.driver.currentLng,
                driverName: assignment.driver.name,
              });
            }

            if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(updatedOrder.status)) {
              send({ type: 'COMPLETED', status: updatedOrder.status });
              clearInterval(interval);
              close();
            }
          } catch {
            clearInterval(interval);
            close();
          }
        }, 5000);

        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          close();
        });
      } catch {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
