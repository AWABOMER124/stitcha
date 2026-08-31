import prisma from '@/lib/db/prisma';
import { requireDeliveryPartner } from '@/lib/auth/delivery-partner';
import { verificationChannels } from '@/modules/delivery-partners/services/partner-security.service';
import { PartnerSecurityForm } from '@/components/partner/security-form';
export default async function SecurityPage() {
  const { userId, verified } = await requireDeliveryPartner();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, phone: true } });
  return <div className="mx-auto max-w-5xl space-y-6" dir="rtl"><header><p className="text-sm text-[var(--primary)]">حساب الشريك</p><h1 className="mt-2 text-2xl font-black">الأمان وتأكيد الحساب</h1><p className="mt-3">{verified ? 'حسابك مؤكّد ✓' : 'أكّد البريد أو واتساب قبل إرسال التطبيق للمراجعة وإنشاء متجر الاختبار.'}</p></header><PartnerSecurityForm {...user} channels={verificationChannels()} /></div>;
}
