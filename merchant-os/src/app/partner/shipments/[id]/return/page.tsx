import { supportsPartnerWaybill } from '@/modules/delivery-partners/services/partner-waybill.service';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { ShipmentLabel } from '@/components/partner/shipment-label';
export default async function ReturnLabel({ params }: { params: Promise<{id:string}> }) {
 const {partnerId}=await requireDeliveryPartner();const {id}=await params;
 const row=await prisma.platformReturnShipment.findFirst({where:{originalShipmentId:id,originalShipment:{partnerId}},include:{originalShipment:{include:{partner:{include:{providerConfig:true}},order:{include:{items:true}}}}}});
 if(!row)notFound();const original=row.originalShipment;
 if(row.providerReference && supportsPartnerWaybill(original.partner.providerConfig?.outboundWebhookUrl)) redirect('/api/partner/shipments/' + id + '/waybill?kind=return');
 const address=(v:unknown)=>v as {name:string;phone:string;state:string;city:string;district:string;address:string;addressDescription:string};
 return <ShipmentLabel isReturn company={original.partner.name} orderNumber={original.order.orderNumber} trackingCode={row.trackingCode} reference={row.providerReference} sender={address(row.pickup)} recipient={address(row.destination)} cod="0" currency={original.currency} reason={row.reason} items={original.order.items.map(i=>({id:i.id,quantity:i.quantity,name:typeof i.productSnapshot==='object'&&i.productSnapshot&&!Array.isArray(i.productSnapshot)&&typeof i.productSnapshot.name==='string'?i.productSnapshot.name:'صنف'}))}/>;
}
