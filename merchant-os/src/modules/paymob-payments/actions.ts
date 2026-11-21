'use server';

import { revalidatePath } from 'next/cache';
import { PLATFORM_PERMISSIONS, requirePlatformPermission } from '@/lib/platform-permissions';
import { savePaymobSettings } from './paymob-settings.service';
import { AppError } from '@/lib/errors';

export async function savePaymobSettingsAction(_previous: { ok: boolean; message: string }, form: FormData) {
  const user = await requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE);
  try {
    const raw = String(form.get('integrationIds') ?? '').trim();
    const integrationIds = raw ? raw.split(/[\s,،]+/).filter(Boolean).map(Number) : [];
    await savePaymobSettings({ enabled: form.get('enabled') === 'on', mode: form.get('mode') === 'LIVE' ? 'LIVE' : 'TEST',
      publicKey: String(form.get('publicKey') ?? ''), secretKey: String(form.get('secretKey') ?? ''), apiKey: String(form.get('apiKey') ?? ''), hmac: String(form.get('hmac') ?? ''), integrationIds }, user.id);
    revalidatePath('/admin/settings/payments'); revalidatePath('/dashboard/subscription');
    return { ok: true, message: 'تم حفظ إعدادات Paymob بأمان.' };
  } catch (error) {
    return { ok: false, message: error instanceof AppError ? error.message : 'راجع المفاتيح ومعرّفات التكامل المدخلة.' };
  }
}
