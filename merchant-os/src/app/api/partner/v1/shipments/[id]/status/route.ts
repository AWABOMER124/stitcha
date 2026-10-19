import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { AppError, BusinessRuleError, NotFoundError } from '@/lib/errors';
import { authenticatePartnerApi } from '@/modules/delivery-partners/services/partner-api-auth';
import { applyShipmentState } from '@/modules/delivery-partners/services/shipment-state.service';

const bodySchema = z.object({
  eventId: z.string().min(8).max(200),
  providerReference: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']),
  note: z.string().trim().max(1000).optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const [{ partnerId, scope }, { id }, body] = await Promise.all([authenticatePartnerApi(request), params, request.json()]);
    if (!scope.split(' ').includes('shipping.read_write')) throw new BusinessRuleError('Missing shipping scope');
    const data = bodySchema.parse(body);
    const shipment = await prisma.platformShipment.findFirst({ where: { id, partnerId }, include: { installation: true } });
    if (!shipment) throw new NotFoundError('Shipment not found');
    if (!shipment.installation?.isActive || shipment.installation.revokedAt) throw new BusinessRuleError('Store installation is inactive');
    try {
      await prisma.deliveryPartnerApiEvent.create({ data: { partnerId, shipmentId: id, eventId: data.eventId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return Response.json({ success: true, data: { applied: false, reason: 'duplicate_event' }, requestId });
      throw error;
    }
    try {
      if (data.providerReference && shipment.providerReference !== data.providerReference) {
        await prisma.platformShipment.update({ where: { id }, data: { providerReference: data.providerReference } });
      }
      const result = await applyShipmentState({ partnerId, shipmentId: id, status: data.status, note: data.note, actorType: 'PARTNER_API',
        metadata: { eventId: data.eventId, occurredAt: data.occurredAt ?? null, installationId: shipment.installationId } });
      await prisma.deliveryPartnerApiEvent.update({ where: { partnerId_eventId: { partnerId, eventId: data.eventId } }, data: { status: 'PROCESSED', processedAt: new Date() } });
      return Response.json({ success: true, data: result, requestId });
    } catch (error) {
      await prisma.deliveryPartnerApiEvent.deleteMany({ where: { partnerId, eventId: data.eventId, status: 'RECEIVED' } });
      throw error;
    }
  } catch (error) {
    const status = error instanceof z.ZodError ? 422 : error instanceof AppError ? error.statusCode : 500;
    return Response.json({ success: false, error: status >= 500 ? 'Processing failed' : error instanceof Error ? error.message : 'Processing failed', requestId }, { status });
  }
}
