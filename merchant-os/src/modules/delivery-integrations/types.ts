import type { DeliveryStatus } from '@prisma/client';

export interface ShipmentParty {
  name: string;
  phone: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  pickup: ShipmentParty;
  dropoff: ShipmentParty;
  codAmount: number;
  currency: string;
}

export interface CreateShipmentResult {
  /** The provider's own ID for this shipment — stored on Delivery.providerReference. */
  providerReference: string;
  trackingUrl?: string;
}

/** Decrypted credentials for a single DeliveryProviderConfig, ready to hand to an adapter. */
export interface DeliveryProviderCredentials {
  apiBaseUrl: string | null;
  secret: string | null;
}

/** A status update parsed out of an inbound provider webhook. */
export interface DeliveryStatusEvent {
  providerReference: string;
  status: Extract<DeliveryStatus, 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'>;
  note?: string;
}

/**
 * One external courier/logistics platform's integration, plugged into
 * delivery-integrations via the registry (see registry.ts). Implement this
 * once a real provider is chosen — nothing else in the app needs to change,
 * callers only depend on this interface.
 */
export interface DeliveryProviderAdapter {
  /** Unique key stored on DeliveryProviderConfig.providerKey to select this adapter. */
  key: string;

  createShipment(input: CreateShipmentInput, credentials: DeliveryProviderCredentials): Promise<CreateShipmentResult>;

  cancelShipment(providerReference: string, credentials: DeliveryProviderCredentials): Promise<void>;

  /**
   * Verify + parse an inbound webhook call from this provider. Return null
   * for an invalid signature or an event type this adapter doesn't handle —
   * the caller treats null as "ignore, don't update anything."
   */
  parseWebhookEvent(
    rawBody: string,
    headers: Record<string, string>,
    credentials: DeliveryProviderCredentials
  ): DeliveryStatusEvent | null;
}
