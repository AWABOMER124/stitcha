import { nanoid } from 'nanoid';
import type { DeliveryProviderAdapter } from '../types';

/**
 * Default adapter — no real courier connected yet. Logs what would have
 * been sent instead of calling a network API, same idea as
 * src/services/notifications/providers/whatsapp.provider.ts's mock
 * provider. Swap a company to a real adapter's key once one is chosen;
 * nothing else in the app needs to change, callers only depend on
 * DeliveryProviderAdapter.
 *
 * Its webhook parsing trusts the JSON body outright with no signature
 * check — fine for local testing of the inbound pipeline, not something a
 * real provider config should be pointed at in production.
 */
export const manualLogAdapter: DeliveryProviderAdapter = {
  key: 'MANUAL_LOG',

  async createShipment(input) {
    const providerReference = `LOG-${nanoid(10).toUpperCase()}`;
    console.log('═══════════════════════════════════════════');
    console.log('📦 [DeliveryIntegrations] Mock Shipment Created (no real courier connected)');
    console.log('───────────────────────────────────────────');
    console.log(`  Order:     ${input.orderNumber}`);
    console.log(`  Reference: ${providerReference}`);
    console.log(`  Pickup:    ${input.pickup.name} — ${input.pickup.address}`);
    console.log(`  Dropoff:   ${input.dropoff.name} — ${input.dropoff.address}`);
    console.log(`  COD:       ${input.codAmount} ${input.currency}`);
    console.log('═══════════════════════════════════════════');
    return { providerReference };
  },

  async cancelShipment(providerReference) {
    console.log(`📦 [DeliveryIntegrations] Mock shipment cancelled: ${providerReference}`);
  },

  parseWebhookEvent(rawBody) {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (typeof payload !== 'object' || payload === null) return null;

    const { providerReference, status, note } = payload as Record<string, unknown>;
    const validStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const;
    if (typeof providerReference !== 'string' || !validStatuses.includes(status as never)) return null;

    return {
      providerReference,
      status: status as (typeof validStatuses)[number],
      note: typeof note === 'string' ? note : undefined,
    };
  },
};
