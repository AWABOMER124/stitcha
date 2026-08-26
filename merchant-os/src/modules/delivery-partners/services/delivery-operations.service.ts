import { nanoid } from 'nanoid';
import prisma from '@/lib/db/prisma';
import { BusinessRuleError } from '@/lib/errors';
import { calculateDeliveryPrice } from './delivery-pricing.service';

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function quotePlatformDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { delivery: true, branch: true },
  });
  if (!order) throw new BusinessRuleError('Order not found');
  const origin = order.branch ?? await prisma.branch.findFirst({ where: { merchantId: order.merchantId, isMain: true } });
  if (origin?.lat == null || origin.lng == null || order.delivery?.lat == null || order.delivery.lng == null) {
    throw new BusinessRuleError('Verified pickup and delivery coordinates are required');
  }
  const tripDistanceKm = distanceKm({ lat: origin.lat, lng: origin.lng }, { lat: order.delivery.lat, lng: order.delivery.lng });

  const rules = await prisma.deliveryPartnerPricingRule.findMany({
    where: {
      isActive: true,
      partner: { status: 'ACTIVE', isActive: true },
      OR: [{ maxDistanceKm: null }, { maxDistanceKm: { gte: tripDistanceKm } }],
    },
    include: { partner: true, serviceArea: true },
    orderBy: [{ priority: 'desc' }, { partner: { rating: 'desc' } }],
  });

  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const candidates = rules.flatMap((rule) => {
    const area = rule.serviceArea;
    if (area && !area.isActive) return [];
    if (area?.centerLat != null && area.centerLng != null && area.radiusKm != null) {
      const insideArea = distanceKm(
        { lat: area.centerLat, lng: area.centerLng },
        { lat: order.delivery!.lat!, lng: order.delivery!.lng! },
      ) <= area.radiusKm;
      if (!insideArea) return [];
    }
    const quote = calculateDeliveryPrice(rule, tripDistanceKm);
    return quote ? [{ rule, quote }] : [];
  }).sort((a, b) => a.quote.amount - b.quote.amount);

  if (candidates.length === 0) return [];
  await prisma.deliveryQuote.updateMany({
    where: { orderId, status: 'OFFERED' },
    data: { status: 'EXPIRED' },
  });
  return prisma.$transaction(candidates.slice(0, 3).map(({ rule, quote }) =>
    prisma.deliveryQuote.create({
      data: {
        orderId,
        partnerId: rule.partnerId,
        pricingRuleId: rule.id,
        distanceKm: tripDistanceKm,
        fee: quote.amount,
        currency: quote.currency,
        etaMinutesMin: rule.serviceArea?.estimatedMinutesMin,
        etaMinutesMax: rule.serviceArea?.estimatedMinutesMax,
        expiresAt,
      },
      include: { partner: { select: { id: true, name: true, rating: true, supportsCod: true } } },
    }),
  ));
}

export async function acceptDeliveryQuote(orderId: string, quoteId: string) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.deliveryQuote.findFirst({
      where: { id: quoteId, orderId },
      include: { order: true, partner: true },
    });
    if (!quote || quote.status !== 'OFFERED' || quote.expiresAt <= new Date()) {
      throw new BusinessRuleError('Delivery quote is no longer available');
    }
    if (quote.order.paymentMethod === 'CASH' && !quote.partner.supportsCod) {
      throw new BusinessRuleError('This delivery partner does not support cash collection');
    }

    const accepted = await tx.deliveryQuote.updateMany({
      where: { id: quote.id, status: 'OFFERED', expiresAt: { gt: new Date() } },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    if (accepted.count !== 1) throw new BusinessRuleError('Delivery quote was already used');
    await tx.deliveryQuote.updateMany({
      where: { orderId, id: { not: quote.id }, status: 'OFFERED' },
      data: { status: 'CANCELLED' },
    });

    const fee = Number(quote.fee);
    await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryMethod: 'WASLAK_DELIVERY',
        deliveryFee: fee,
        total: Number(quote.order.subtotal) - Number(quote.order.discount) + Number(quote.order.tax) + fee,
        delivery: { update: { type: 'WASLAK_DELIVERY', fee } },
      },
    });
    const shipment = await tx.platformShipment.create({
      data: {
        orderId,
        quoteId: quote.id,
        partnerId: quote.partnerId,
        trackingCode: `WSL-${nanoid(10).toUpperCase()}`,
        fee,
        currency: quote.currency,
        events: { create: { status: 'REQUESTED', actorType: 'SYSTEM' } },
      },
    });
    if (quote.order.paymentMethod === 'CASH') {
      await tx.codCollection.create({
        data: { shipmentId: shipment.id, expectedAmount: Number(quote.order.total) + fee, currency: quote.currency },
      });
    }
    return shipment;
  });
}
