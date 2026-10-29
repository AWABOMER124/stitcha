import prisma from '@/lib/db/prisma';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { activateMerchantReferral } from '@/modules/merchant-referrals/merchant-referrals.service';
import { getPendingDirectRegistration } from '@/modules/phone-verification/direct-registration';
import {
  sendAccountCode,
  verifyAccountCode,
  type AccountVerificationChannel,
} from './account-verification.service';

export type RegistrationVerificationInput = {
  verificationToken?: string;
  userId?: string;
};

type Subject = {
  userId: string;
  audience: 'merchant' | 'marketer' | 'partner';
  merchantId?: string;
  merchantSlug?: string;
  email: string;
};

export async function resolveRegistrationSubject(input: RegistrationVerificationInput): Promise<Subject> {
  if (input.verificationToken) {
    const { merchant, owner } = await getPendingDirectRegistration(input.verificationToken);
    return { userId: owner.id, audience: 'merchant', merchantId: merchant.id, merchantSlug: merchant.slug, email: owner.email };
  }
  if (!input.userId) throw new ValidationError('طلب التحقق غير صالح');
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      role: true,
      marketerAccount: { select: { id: true } },
      deliveryPartnerUsers: { where: { isActive: true }, select: { id: true }, take: 1 },
    },
  });
  if (!user) throw new NotFoundError('Account');
  if (user.role === 'MARKETER' && user.marketerAccount) {
    return { userId: user.id, audience: 'marketer', email: user.email };
  }
  if (user.role.startsWith('DELIVERY_PARTNER_') && user.deliveryPartnerUsers.length) {
    return { userId: user.id, audience: 'partner', email: user.email };
  }
  throw new ValidationError('هذا الحساب لا يدعم مسار التحقق المطلوب');
}

export async function requestRegistrationCode(input: RegistrationVerificationInput, channel: AccountVerificationChannel) {
  const subject = await resolveRegistrationSubject(input);
  const result = await sendAccountCode(subject.userId, channel, subject.audience);
  return { ...result, channel };
}

export async function completeRegistrationVerification(
  input: RegistrationVerificationInput,
  channel: AccountVerificationChannel,
  code: string,
) {
  const subject = await resolveRegistrationSubject(input);
  await verifyAccountCode(subject.userId, channel, code);
  if (subject.merchantId) {
    await prisma.$transaction(async tx => {
      const activated = await tx.merchant.updateMany({
        where: { id: subject.merchantId, status: 'PENDING' },
        data: { status: 'ACTIVE', registrationToken: null, registrationTokenExpiresAt: null },
      });
      if (activated.count) await activateMerchantReferral(subject.merchantId!, tx);
    });
  }
  return { verified: true, email: subject.email, slug: subject.merchantSlug, audience: subject.audience };
}
