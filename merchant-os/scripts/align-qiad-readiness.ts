import prisma from '@/lib/db/prisma';
import { alignQiadPricing } from '@/modules/delivery-partners/services/align-qiad-pricing.service';
import { enqueuePendingInstallations } from '@/modules/delivery-partners/services/installation-sync.service';
(async()=>{const id=process.argv[2];if(!id)throw Error('partnerId is required');console.log(JSON.stringify({pricing:await alignQiadPricing(id),queuedInstallations:await enqueuePendingInstallations(id)}));})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
