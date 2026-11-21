import { isQiadIntegration, qiadPhone } from './partner-protocol';
import { providerAddress } from './provider-coverage';
import { coverageSpecificity } from '@/lib/geography/regional-coverage';
import { saudiShippingCharges } from './saudi-shipping-policy';
import { nanoid } from "nanoid";
import prisma from "@/lib/db/prisma";
import { BusinessRuleError } from "@/lib/errors";
import { calculateDeliveryPrice } from "./delivery-pricing.service";
import { dispatchShipmentToPartner } from "./partner-integration.service";
import { enqueueJob } from '@/services/jobs/outbox.service';
import { validatePartnerEndpoint } from './partner-endpoint';
import { getOrderDeliveryAddress, hasCompleteDeliveryAddress } from '@/lib/addresses/order-address';

import { routeDistance, coversDelivery, supportsAddressOnly } from "./delivery-coverage";

export async function quotePlatformDelivery(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      merchant: { select: { subscriptionMarket: true, currency: true } },
      delivery: true,
      branch: true,
      platformShipment: { select: { id: true } },
    },
  });
  if (!order) throw new BusinessRuleError("Order not found");
  if (order.deliveryMethod === "PICKUP")
    throw new BusinessRuleError("Pickup orders cannot request delivery quotes");
  if (["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status))
    throw new BusinessRuleError("This order can no longer request delivery");
  if (order.platformShipment)
    throw new BusinessRuleError(
      "A delivery shipment already exists for this order",
    );
  const origin =
    order.branch ??
    (await prisma.branch.findFirst({
      where: { merchantId: order.merchantId, isMain: true, isActive: true },
    }));
  if (!origin) throw new BusinessRuleError("Pickup branch is required");
  const address = getOrderDeliveryAddress(order);
  if (!hasCompleteDeliveryAddress(address)) throw new BusinessRuleError("أكمل المدينة والحي والعنوان التفصيلي قبل طلب عرض الشحن.");
  const tripDistanceKm = routeDistance(origin, order.delivery);

  const rules = await prisma.deliveryPartnerPricingRule.findMany({
    where: {
      isActive: true,
      partner: {
        status: "ACTIVE",
        isActive: true,
        appStatus: "PUBLISHED",
        ...(order.paymentMethod === 'CASH' ? { supportsCod: true } : {}),
        providerConfig: { isActive: true, market: order.merchant?.subscriptionMarket ?? 'SD' },
        merchantConnections: {
          some: { merchantId: order.merchantId, isActive: true, revokedAt: null, providerSyncStatus: { in: ['READY', 'NOT_REQUIRED'] } },
        },
      },
      ...(tripDistanceKm == null ? { perKmFee: 0, maxDistanceKm: null }
        : { OR: [{ maxDistanceKm: null }, { maxDistanceKm: { gte: tripDistanceKm } }] }),
    },
    include: { partner: { include: { providerConfig: true, merchantConnections: { where: { merchantId: order.merchantId, isActive: true, revokedAt: null }, select: { providerSyncStatus: true } } } }, serviceArea: true },
    orderBy: [{ priority: "desc" }, { partner: { rating: "desc" } }],
  });

  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const candidates = rules
    .flatMap((rule) => {
      if (isQiadIntegration(rule.partner.providerConfig?.outboundWebhookUrl) && rule.partner.merchantConnections[0]?.providerSyncStatus!=='READY') return [];
      const area = rule.serviceArea;
      if (!area?.isActive || area.partnerId !== rule.partnerId) return [];
      if (tripDistanceKm == null && !supportsAddressOnly(rule.partner.providerConfig)) return [];
      const scopedAddress = providerAddress(rule.partner.providerConfig,address);
      if (!scopedAddress || !coversDelivery(area, order.delivery, scopedAddress)) return [];
      const quote = calculateDeliveryPrice(rule, tripDistanceKm);
      if (order.merchant?.subscriptionMarket === 'SA' && (order.merchant.currency !== 'SAR' || quote?.currency !== 'SAR' || quote.amount !== 20)) return [];
      return quote ? [{ rule, quote }] : [];
    })
    .sort((a, b) => coverageSpecificity(b.rule.serviceArea!) - coverageSpecificity(a.rule.serviceArea!)
      || b.rule.priority - a.rule.priority || a.quote.amount - b.quote.amount);

  // Choose the most specific scope per company, then compare company prices.
  const seenPartners = new Set<string>();
  const uniqueCandidates = candidates.filter((candidate) => {
    if (seenPartners.has(candidate.rule.partnerId)) return false;
    seenPartners.add(candidate.rule.partnerId);
    return true;
  }).sort((a, b) => a.quote.amount - b.quote.amount);

  if (uniqueCandidates.length === 0) return [];
  await prisma.deliveryQuote.updateMany({
    where: { orderId, status: "OFFERED" },
    data: { status: "EXPIRED" },
  });
  return prisma.$transaction(
    uniqueCandidates.slice(0, 3).map(({ rule, quote }) =>
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
        include: {
          partner: {
            select: { id: true, name: true, rating: true, supportsCod: true },
          },
        },
      }),
    ),
  );
}

export async function acceptDeliveryQuote(orderId: string, quoteId: string) {
  const shipment = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const quote = await tx.deliveryQuote.findFirst({
      where: { id: quoteId, orderId },
      include: {
        order: {
          include: {
            merchant: { select: { subscriptionMarket: true, currency: true } },
            payment: true,
            customer: true,
            delivery: true,
            branch: true,
            platformShipment: { select: { id: true } },
          },
        },
        partner: true,
        pricingRule: { include: { serviceArea: true } },
      },
    });
    if (!quote || quote.status !== "OFFERED" || quote.expiresAt <= new Date()) {
      throw new BusinessRuleError("Delivery quote is no longer available");
    }
    if (quote.order.paymentMethod === "CASH" && !quote.partner.supportsCod) {
      throw new BusinessRuleError(
        "This delivery partner does not support cash collection",
      );
    }
    const saudi = quote.order.merchant?.subscriptionMarket === 'SA';
    if (quote.order.paymentMethod !== "CASH" && !(saudi && quote.order.payment?.status === 'COMPLETED')) {
      throw new BusinessRuleError(
        "يلزم إكمال الدفع قبل طلب الشحن، أو اختيار الدفع عند الاستلام.",
      );
    }
    if (quote.order.platformShipment)
      throw new BusinessRuleError(
        "A delivery shipment already exists for this order",
      );

    if (['CANCELLED', 'REJECTED', 'DELIVERED'].includes(quote.order.status) || quote.order.deliveryMethod === 'PICKUP') throw new BusinessRuleError('Order cannot request delivery');
    await tx.$queryRaw`SELECT id FROM delivery_partners WHERE id = ${quote.partnerId} FOR SHARE`;
    const partner = await tx.deliveryPartner.findUniqueOrThrow({ where: { id: quote.partnerId }, include: { providerConfig: true } });
    const connection = await tx.merchantDeliveryPartner.findUnique({ where: { merchantId_partnerId: { merchantId: quote.order.merchantId, partnerId: quote.partnerId } } });
    if (!partner.isActive || partner.status !== 'ACTIVE' || partner.appStatus !== 'PUBLISHED' || (quote.order.paymentMethod === 'CASH' && !partner.supportsCod) || !connection?.isActive || connection.revokedAt) throw new BusinessRuleError('Partner is no longer eligible');
    const config = partner.providerConfig;
    if ((config?.market ?? 'SD') !== (quote.order.merchant?.subscriptionMarket ?? 'SD')) throw new BusinessRuleError('شركة الشحن لا تطابق سوق المتجر.');
    if (saudi && (quote.order.merchant.currency !== 'SAR' || quote.currency !== 'SAR' || Number(quote.fee) !== 20)) throw new BusinessRuleError('تسعيرة الشحن السعودي تحتاج مراجعة.');
    if (isQiadIntegration(config?.outboundWebhookUrl) && connection?.providerSyncStatus!=='READY') throw new BusinessRuleError('انتظر اكتمال ربط المتجر بشركة الشحن.');
    if (!config?.isActive || !['PARTNER_HTTP_V1', 'TEST_SIMULATOR'].includes(config.providerKey)) throw new BusinessRuleError('Partner integration is inactive');
    if (config.providerKey === 'PARTNER_HTTP_V1') {
      if (config.integrationMode === 'APP_V1') {
        const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
        if (!scopes.includes('shipping.read_write')) throw new BusinessRuleError('Partner installation is missing shipping permission');
        if (!config.clientId || !config.clientSecretHash || !config.outboundWebhookUrl || !config.webhookSigningSecret) throw new BusinessRuleError('Partner app integration is incomplete');
        validatePartnerEndpoint(config.outboundWebhookUrl, config.approvedOrigin);
      } else {
        if (!config.apiBaseUrl || !config.credentials) throw new BusinessRuleError('Partner integration is incomplete');
        validatePartnerEndpoint(config.apiBaseUrl, config.approvedOrigin);
      }
    }
    const rule = quote.pricingRule;
    const area = rule?.serviceArea;
    const origin = quote.order.branch ?? await tx.branch.findFirst({ where: { merchantId: quote.order.merchantId, isMain: true, isActive: true } });
    const destination = quote.order.delivery;
    if (!rule?.isActive || rule.partnerId !== partner.id || !area?.isActive || area.partnerId !== partner.id || !origin) throw new BusinessRuleError('Coverage needs verification');
    if (config.providerKey === 'PARTNER_HTTP_V1') {
      const pickupAddress = origin.address?.trim() || (await tx.merchant.findUniqueOrThrow({ where: { id: quote.order.merchantId }, select: { address: true } })).address?.trim();
      if (!pickupAddress) throw new BusinessRuleError('أكمل عنوان استلام الشحنة في إعدادات الفرع قبل اختيار شركة الشحن.');
      if (isQiadIntegration(config.outboundWebhookUrl)) {
        const phone=origin.phone || (await tx.merchant.findUniqueOrThrow({where:{id:quote.order.merchantId},select:{phone:true}})).phone;
        if(!qiadPhone(phone, config.market))throw new BusinessRuleError('أكمل رقم اتصال صحيحًا للفرع قبل اختيار شركة الشحن.');
        if(!qiadPhone(quote.order.customerPhone||quote.order.customer?.phone, config.market))throw new BusinessRuleError('راجع رقم هاتف العميل قبل اختيار شركة الشحن.');
      }
    }
    const address = getOrderDeliveryAddress(quote.order);
    if (!hasCompleteDeliveryAddress(address)) throw new BusinessRuleError("أكمل المدينة والحي والعنوان التفصيلي قبل إصدار بوليصة الشحن.");
    const distance = routeDistance(origin, destination);
    if (distance == null && !supportsAddressOnly(config)) throw new BusinessRuleError('This provider requires pickup and delivery coordinates');
    const currentPrice = calculateDeliveryPrice(rule, distance);
    const distanceChanged = (distance == null) !== (quote.distanceKm == null)
      || (distance != null && quote.distanceKm != null && Math.abs(distance - Number(quote.distanceKm)) > 0.01);
    if (!providerAddress(config,address) || !coversDelivery(area, destination, providerAddress(config,address)!) || !currentPrice || distanceChanged
      || currentPrice.currency !== quote.currency || Math.abs(currentPrice.amount - Number(quote.fee)) > 0.001) {
      throw new BusinessRuleError('Delivery address, price or coverage changed; request a new quote');
    }

    const accepted = await tx.deliveryQuote.updateMany({
      where: { id: quote.id, status: "OFFERED", expiresAt: { gt: new Date() } },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (accepted.count !== 1)
      throw new BusinessRuleError("Delivery quote was already used");
    await tx.deliveryQuote.updateMany({
      where: { orderId, id: { not: quote.id }, status: "OFFERED" },
      data: { status: "CANCELLED" },
    });

    const fee = Number(quote.fee);
    const saudiCharges = saudi ? saudiShippingCharges({ subtotal: Number(quote.order.subtotal), discount: Number(quote.order.discount), cash: quote.order.paymentMethod === 'CASH' }) : null;
    const total =
      saudi ? Number(quote.order.total) :
      Number(quote.order.subtotal) -
      Number(quote.order.discount) +
      Number(quote.order.tax) +
      fee;
    await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryMethod: "WASLAK_DELIVERY",
        deliveryFee: saudi ? quote.order.deliveryFee : fee,
        total,
        delivery: { update: { type: "WASLAK_DELIVERY", fee: saudi ? quote.order.deliveryFee : fee } },
        ...(!saudi && quote.order.payment
          ? { payment: { update: { amount: total } } }
          : {}),
      },
    });
    const shipment = await tx.platformShipment.create({
      data: {
        orderId,
        quoteId: quote.id,
        partnerId: quote.partnerId,
        installationId: connection.id,
        trackingCode: `WSL-${nanoid(10).toUpperCase()}`,
        fee,
        ...(saudiCharges ? { collectionFee: saudiCharges.collectionFee, feePayer: saudiCharges.feePayer, pricingPolicy: saudiCharges.pricingPolicy } : {}),
        currency: quote.currency,
        events: { create: { status: "REQUESTED", actorType: "SYSTEM" } },
      },
    });
    if (quote.order.paymentMethod === "CASH") {
      await tx.codCollection.create({
        data: {
          shipmentId: shipment.id,
          expectedAmount: total,
          currency: quote.currency,
        },
      });
    }
    await enqueueJob({ topic: 'delivery.partner.dispatch', payload: { shipmentId: shipment.id }, idempotencyKey: `delivery:dispatch:${shipment.id}`, maxAttempts: 8 }, tx);
    return shipment;
  });
  await dispatchShipmentToPartner(shipment.id).catch((error) => {
    console.error(
      "[delivery-partners] Partner dispatch failed; shipment remains queued",
      shipment.id,
      error,
    );
  });
  return shipment;
}
