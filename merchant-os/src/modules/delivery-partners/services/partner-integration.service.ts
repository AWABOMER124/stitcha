import { createHmac, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import prisma from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/crypto/secret";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import * as ordersService from "@/modules/orders/services/orders.service";
import type { PlatformShipmentStatus } from "@prisma/client";

export async function dispatchShipmentToPartner(shipmentId: string) {
  const shipment = await prisma.platformShipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: {
      partner: { include: { providerConfig: true } },
      order: {
        include: {
          branch: true,
          merchant: { select: { name: true, phone: true, address: true } },
          delivery: true,
        },
      },
    },
  });
  const config = shipment.partner.providerConfig;
  if (!config?.isActive) return null;
  if (config.providerKey === "TEST_SIMULATOR") {
    const providerReference = `TEST-${nanoid(10).toUpperCase()}`;
    await prisma.platformShipment.update({
      where: { id: shipment.id },
      data: { providerReference },
    });
    return { providerReference };
  }
  if (
    config.providerKey !== "PARTNER_HTTP_V1" ||
    !config.apiBaseUrl ||
    !config.credentials
  )
    return null;
  const secret = decryptSecret(config.credentials);
  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, "")}/shipments`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
        "idempotency-key": shipment.id,
      },
      body: JSON.stringify({
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        orderNumber: shipment.order.orderNumber,
        pickup: {
          name: shipment.order.branch?.name ?? shipment.order.merchant.name,
          phone: shipment.order.branch?.phone ?? shipment.order.merchant.phone,
          address:
            shipment.order.branch?.address ?? shipment.order.merchant.address,
          lat: shipment.order.branch?.lat,
          lng: shipment.order.branch?.lng,
        },
        dropoff: {
          name: shipment.order.customerName,
          phone: shipment.order.customerPhone,
          address: shipment.order.customerAddress,
          lat: shipment.order.delivery?.lat,
          lng: shipment.order.delivery?.lng,
        },
        codAmount: Number(shipment.order.total),
        currency: shipment.currency,
      }),
    },
  );
  if (!response.ok)
    throw new BusinessRuleError(
      `Partner API rejected shipment (${response.status})`,
    );
  const data = (await response.json()) as { providerReference?: string };
  if (!data.providerReference)
    throw new BusinessRuleError("Partner API did not return providerReference");
  await prisma.platformShipment.update({
    where: { id: shipment.id },
    data: { providerReference: data.providerReference },
  });
  return data;
}

function validSignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature.replace(/^sha256=/, ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handlePartnerWebhook(
  token: string,
  rawBody: string,
  signature: string | null,
) {
  const config = await prisma.deliveryPartnerProviderConfig.findUnique({
    where: { webhookToken: token },
  });
  if (!config || !config.isActive) throw new NotFoundError("Webhook not found");
  if (!config.credentials)
    throw new BusinessRuleError("Partner webhook secret is not configured");
  if (!validSignature(rawBody, signature, decryptSecret(config.credentials)))
    throw new BusinessRuleError("Invalid webhook signature");
  const data = JSON.parse(rawBody) as {
    providerReference?: string;
    status?: PlatformShipmentStatus;
    note?: string;
  };
  const allowed: PlatformShipmentStatus[] = [
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
    "CANCELLED",
  ];
  if (!data.providerReference || !data.status || !allowed.includes(data.status))
    throw new BusinessRuleError("Invalid webhook event");
  const shipment = await prisma.platformShipment.findFirst({
    where: {
      partnerId: config.partnerId,
      providerReference: data.providerReference,
    },
    include: { order: { select: { merchantId: true, status: true } } },
  });
  if (!shipment) return;
  await prisma.platformShipment.update({
    where: { id: shipment.id },
    data: {
      status: data.status,
      ...(data.status === "ASSIGNED" ? { assignedAt: new Date() } : {}),
      ...(data.status === "PICKED_UP" ? { pickedUpAt: new Date() } : {}),
      ...(data.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      events: {
        create: {
          status: data.status,
          note: data.note,
          actorType: "PARTNER_API",
          metadata: { providerReference: data.providerReference },
        },
      },
    },
  });
  if (
    ["PICKED_UP", "IN_TRANSIT"].includes(data.status) &&
    shipment.order.status !== "OUT_FOR_DELIVERY"
  )
    await ordersService
      .updateOrderStatus(
        shipment.order.merchantId,
        shipment.orderId,
        "OUT_FOR_DELIVERY",
        `Partner webhook: ${data.status}`,
      )
      .catch(() => null);
  if (data.status === "DELIVERED" && shipment.order.status !== "DELIVERED")
    await ordersService
      .updateOrderStatus(
        shipment.order.merchantId,
        shipment.orderId,
        "DELIVERED",
        "Partner webhook: DELIVERED",
      )
      .catch(() => null);
}
