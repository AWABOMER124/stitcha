'use server';

import prisma from '@/lib/db/prisma';
import * as service from './services/phone-verification.service';
import { requestOtpSchema, verifyOtpSchema } from './schemas/phone-verification.schemas';
import type { ActionResult } from '@/lib/types';

/**
 * Note: these actions intentionally don't require an authenticated session —
 * they're used mid-signup, before the user has ever logged in. `userId` here
 * acts as a short-lived capability handed to the client immediately after
 * account creation, scoped to finishing that one signup flow.
 */

export async function requestPhoneOtpAction(formData: unknown): Promise<ActionResult<{ phone: string; expiresInMinutes: number }>> {
  try {
    const parsed = requestOtpSchema.parse(formData);
    const data = await service.sendOtp(parsed.userId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل إرسال رمز التحقق' };
  }
}

/**
 * Verifies the OTP and, if the signup flow is finishing a Distributor or
 * Merchant registration, activates that record in the same call — this is
 * registration-completion logic, not something the generic phone-verification
 * service itself should know about.
 */
export async function verifyPhoneOtpAction(formData: {
  userId: string;
  code: string;
  activateDistributorId?: string;
  activateMerchantId?: string;
}): Promise<ActionResult<{ verified: boolean }>> {
  try {
    const parsed = verifyOtpSchema.parse(formData);
    const data = await service.verifyOtp(parsed.userId, parsed.code);

    const { activateDistributorId, activateMerchantId } = formData;
    if (activateDistributorId) {
      await prisma.distributor.update({ where: { id: activateDistributorId }, data: { status: 'ACTIVE' } });
    }
    if (activateMerchantId) {
      await prisma.merchant.update({
        where: { id: activateMerchantId },
        data: { status: 'ACTIVE', registrationToken: null, registrationTokenExpiresAt: null },
      });
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'فشل التحقق من الرمز' };
  }
}
