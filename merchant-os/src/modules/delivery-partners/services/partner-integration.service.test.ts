import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipment = {
  id: 'shipment_1', orderId: 'order_1', partnerId: 'partner_1', installationId: 'installation_1', trackingCode: 'WSL-1', providerReference: null,
  status: 'REQUESTED', fee: 150, currency: 'SDG', createdAt: new Date('2026-10-20T10:00:00Z'),
  installation: { id: 'installation_1', merchantId: 'merchant_1', partnerId: 'partner_1', isActive: true, revokedAt: null },
  partner: { isActive: true, status: 'ACTIVE', appStatus: 'PUBLISHED', providerConfig: { providerKey: 'PARTNER_HTTP_V1', apiBaseUrl: 'https://carrier.example', credentials: 'encrypted', isActive: true } },
  order: { id: 'order_1', merchantId: 'merchant_1', customerId: 'customer_1', orderNumber: 'ORD-1', status: 'READY', customerName: 'Customer', customerPhone: '+249900000000', customerAddress: 'Khartoum', subtotal: 850, discount: 0, tax: 0, total: 1000,
    paymentMethod: 'CASH', notes: 'Fragile', branch: { name: 'Main', phone: '+249911111111', address: 'Store', lat: 15.5, lng: 32.5 },
    merchant: { id: 'merchant_1', name: 'Store', slug: 'store', phone: '+249911111111', email: 'store@example.com', address: 'Store', currency: 'SDG' },
    customer: { id: 'customer_1', name: 'Customer', phone: '+249900000000', email: null, address: 'Khartoum' }, delivery: { lat: 15.6, lng: 32.6 }, payment: { status: 'PENDING' },
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ providerReference: 'CARRIER-1' }) }));
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

  it('sends an installation-scoped signed app event without mixing merchant identity', async () => {
    const appShipment = { ...shipment, partner: { ...shipment.partner, providerConfig: { ...shipment.partner.providerConfig,
      integrationMode: 'APP_V1', clientId: 'wsl_app_client', clientSecretHash: 'hash', outboundWebhookUrl: 'https://carrier.example/events', webhookSigningSecret: 'encrypted-webhook' } } };
    tx.platformShipment.findUniqueOrThrow.mockReset().mockResolvedValueOnce(appShipment).mockResolvedValueOnce(appShipment);
    await dispatchShipmentToPartner('shipment_1');
    const [url, request] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://carrier.example/events');
    const headers = new Headers(request.headers);
    expect(headers.get('x-wasla-client-id')).toBe('wsl_app_client');
    expect(headers.get('x-wasla-signature')).toMatch(/^sha256=[a-f0-9]{64}$/);
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({ type: 'shipment.created', installation: { id: 'installation_1', merchantId: 'merchant_1' },
      store: { id: 'merchant_1', slug: 'store' }, shipment: { id: 'shipment_1', orderId: 'order_1' },
      sender: { name: 'Main' }, recipient: { customerId: 'customer_1', phone: '+249900000000' } });
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
