import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipment = {
  id: 'shipment_1', orderId: 'order_1', partnerId: 'partner_1', trackingCode: 'WSL-1', providerReference: null,
  status: 'REQUESTED', fee: 150, currency: 'SDG',
  partner: { isActive: true, status: 'ACTIVE', appStatus: 'PUBLISHED', providerConfig: { providerKey: 'PARTNER_HTTP_V1', apiBaseUrl: 'https://carrier.example', credentials: 'encrypted', isActive: true } },
  order: { orderNumber: 'ORD-1', status: 'READY', customerName: 'Customer', customerPhone: '+249900000000', customerAddress: 'Khartoum', total: 1000,
    paymentMethod: 'CASH', notes: 'Fragile', branch: { name: 'Main', phone: '+249911111111', address: 'Store', lat: 15.5, lng: 32.5 },
    merchant: { phone: '+249911111111', address: 'Store' }, delivery: { lat: 15.6, lng: 32.6 }, payment: { status: 'PENDING' },
    items: [{ productSnapshot: { name: 'Phone', sku: 'P-1' }, quantity: 2, unitPrice: 425, total: 850, notes: null }] },
};
const tx = { $queryRaw: vi.fn(), platformShipment: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, branch: { findFirst: vi.fn() } };
const prisma = { $transaction: vi.fn(), platformShipment: { findUnique: vi.fn() } };
vi.mock('@/lib/db/prisma', () => ({ default: prisma }));
vi.mock('@/lib/crypto/secret', () => ({ decryptSecret: () => 'provider-secret' }));

const { dispatchShipmentToPartner, cancelShipmentAtPartner } = await import('./partner-integration.service');

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
  tx.platformShipment.findUniqueOrThrow.mockResolvedValueOnce(shipment).mockResolvedValueOnce(shipment);
  tx.platformShipment.update.mockResolvedValue({});
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ providerReference: 'CARRIER-1' }) }));
  process.env.DELIVERY_PARTNER_API_ORIGINS = 'https://carrier.example';
});

describe('delivery partner HTTP contract', () => {
  it('sends a versioned, idempotent create payload with payment and line items', async () => {
    await dispatchShipmentToPartner('shipment_1');
    const [url, request] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://carrier.example/shipments');
    expect(new Headers(request.headers).get('idempotency-key')).toBe('shipment_1');
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({ event: 'shipment.create', version: '2026-10-01', shipmentId: 'shipment_1',
      payment: { method: 'CASH', codAmount: 1000 }, items: [{ name: 'Phone', sku: 'P-1', quantity: 2 }] });
  });

  it('does not create a shipment after cancellation wins the race', async () => {
    tx.platformShipment.findUniqueOrThrow.mockReset().mockResolvedValueOnce({ ...shipment, status: 'CANCELLED' }).mockResolvedValueOnce({ ...shipment, status: 'CANCELLED' });
    await expect(dispatchShipmentToPartner('shipment_1')).resolves.toEqual({ skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends an idempotent cancellation to the provider', async () => {
    prisma.platformShipment.findUnique.mockResolvedValue({ ...shipment, status: 'CANCELLED', providerReference: 'CARRIER/1' });
    await cancelShipmentAtPartner('shipment_1');
    const [url, request] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://carrier.example/shipments/CARRIER%2F1/cancel');
    expect(new Headers(request.headers).get('idempotency-key')).toBe('cancel:shipment_1');
  });
});
