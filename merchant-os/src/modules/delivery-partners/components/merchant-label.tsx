import { supportsPartnerWaybill } from '@/modules/delivery-partners/services/partner-waybill.service';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { getAuthContext, requirePermission } from '@/lib/permissions';
import { getOrderDeliveryAddress } from '@/lib/addresses/order-address';
import { ShipmentLabel } from '@/components/partner/shipment-label';
export async function MerchantLabel({ orderId, isReturn = false }: { orderId: string; isReturn?: boolean }) {
 const context = await getAuthContext(); requirePermission(context,'orders:read');
 const row = await prisma.platformShipment.findFirst({ where: { orderId, order: { merchantId: context.merchantId } }, include: { returnShipment: true, partner: { include: { providerConfig: true } }, order: { include: { merchant: true, branch: true, customer: true, delivery: true, items: true } } } });
 if (!row || (isReturn && !row.returnShipment)) notFound();
 const r = isReturn ? row.returnShipment : null;
 if ((r ? r.providerReference : row.providerReference) && supportsPartnerWaybill(row.partner.providerConfig?.outboundWebhookUrl)) redirect('/api/merchant/orders/' + orderId + '/waybill' + (isReturn ? '?kind=return' : ''));
 const branch = row.order.branch ?? await prisma.branch.findFirst({ where:{ merchantId: context.merchantId, isMain:true,isActive:true } });
 const customer = { name: row.order.customerName || row.order.customer.name, phone: row.order.customerPhone || row.order.customer.phone, ...getOrderDeliveryAddress(row.order) };
 const merchant = { name: row.order.merchant.name, phone: branch?.phone || row.order.merchant.phone, address: branch?.address || row.order.merchant.address };
 const asAddress = (v: unknown) => v as { name: string; phone: string; state: string; city: string; district: string; address: string; addressDescription: string };
 return <ShipmentLabel company={row.partner.name} orderNumber={row.order.orderNumber} trackingCode={r?.trackingCode ?? row.trackingCode} reference={r ? r.providerReference : row.providerReference} sender={r ? asAddress(r.pickup) : merchant} recipient={r ? asAddress(r.destination) : customer} currency={row.currency} cod={r || row.order.paymentMethod !== 'CASH' ? '0' : row.order.total.toString()} reason={r?.reason} isReturn={isReturn} items={row.order.items.map(i => ({ id:i.id, quantity:i.quantity, name: typeof i.productSnapshot === 'object' && i.productSnapshot && !Array.isArray(i.productSnapshot) && typeof i.productSnapshot.name === 'string' ? i.productSnapshot.name : 'صنف' }))} />;
}
