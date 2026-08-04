import { describe, it, expect, vi, beforeEach } from 'vitest';
import { manualLogAdapter } from './manual-log.adapter';

describe('manualLogAdapter', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('createShipment', () => {
    it('returns a LOG- prefixed provider reference and logs the intent instead of calling a network API', async () => {
      const result = await manualLogAdapter.createShipment(
        {
          orderId: 'order_1',
          orderNumber: 'ORD-TEST',
          pickup: { name: 'Merchant', phone: '0900000000', address: 'Khartoum' },
          dropoff: { name: 'Customer', phone: '0911111111', address: 'Omdurman' },
          codAmount: 50,
          currency: 'SDG',
        },
        { apiBaseUrl: null, secret: null }
      );

      expect(result.providerReference).toMatch(/^LOG-/);
      expect(console.log).toHaveBeenCalled();
    });

    it('generates a different reference on each call', async () => {
      const input = {
        orderId: 'order_1',
        orderNumber: 'ORD-TEST',
        pickup: { name: 'M', phone: '1', address: 'A' },
        dropoff: { name: 'C', phone: '2', address: 'B' },
        codAmount: 10,
        currency: 'SDG',
      };
      const a = await manualLogAdapter.createShipment(input, { apiBaseUrl: null, secret: null });
      const b = await manualLogAdapter.createShipment(input, { apiBaseUrl: null, secret: null });
      expect(a.providerReference).not.toBe(b.providerReference);
    });
  });

  describe('cancelShipment', () => {
    it('resolves without throwing', async () => {
      await expect(manualLogAdapter.cancelShipment('LOG-ABC', { apiBaseUrl: null, secret: null })).resolves.toBeUndefined();
    });
  });

  describe('parseWebhookEvent', () => {
    const creds = { apiBaseUrl: null, secret: null };

    it('parses a valid payload', () => {
      const event = manualLogAdapter.parseWebhookEvent(
        JSON.stringify({ providerReference: 'LOG-ABC', status: 'DELIVERED', note: 'left at door' }),
        {},
        creds
      );
      expect(event).toEqual({ providerReference: 'LOG-ABC', status: 'DELIVERED', note: 'left at door' });
    });

    it('omits note when absent', () => {
      const event = manualLogAdapter.parseWebhookEvent(JSON.stringify({ providerReference: 'LOG-ABC', status: 'IN_TRANSIT' }), {}, creds);
      expect(event?.note).toBeUndefined();
    });

    it('returns null for malformed JSON', () => {
      expect(manualLogAdapter.parseWebhookEvent('not json', {}, creds)).toBeNull();
    });

    it('returns null for a non-object payload', () => {
      expect(manualLogAdapter.parseWebhookEvent('"just a string"', {}, creds)).toBeNull();
    });

    it('returns null for an invalid status', () => {
      expect(manualLogAdapter.parseWebhookEvent(JSON.stringify({ providerReference: 'LOG-ABC', status: 'NONSENSE' }), {}, creds)).toBeNull();
    });

    it('returns null when providerReference is missing', () => {
      expect(manualLogAdapter.parseWebhookEvent(JSON.stringify({ status: 'DELIVERED' }), {}, creds)).toBeNull();
    });
  });
});
