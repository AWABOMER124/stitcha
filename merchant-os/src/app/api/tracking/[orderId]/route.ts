import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });

        if (!order) {
          send({ type: 'ERROR', message: 'Order not found' });
          controller.close();
          return;
        }

        send({ type: 'ORDER_STATUS', status: order.status });

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
              controller.close();
              return;
            }

            send({ type: 'ORDER_STATUS', status: updatedOrder.status });

            if (assignment?.driver?.currentLat && assignment.driver.currentLng) {
              send({
                type: 'DRIVER_LOCATION',
                lat: assignment.driver.currentLat,
                lng: assignment.driver.currentLng,
                driverName: assignment.driver.name,
                driverPhone: assignment.driver.phone,
              });
            }

            if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(updatedOrder.status)) {
              send({ type: 'COMPLETED', status: updatedOrder.status });
              clearInterval(interval);
              controller.close();
            }
          } catch {
            clearInterval(interval);
            controller.close();
          }
        }, 5000);

        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      } catch {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
