'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/permissions';
import { saveQuote, changeQuoteState, saveSalesSettings, switchSaleToOnline } from './service';

export async function saveQuoteAction(input: unknown, id?: string, version?: number) {
  try {
    const result = await saveQuote(await getAuthContext(), input, id, version);
    revalidatePath('/dashboard/sales');
    return { success: true as const, data: result };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر حفظ العرض' }; }
}

export async function changeQuoteAction(id: string, version: number, decision: 'APPROVE' | 'CANCEL') {
  try {
    if (!['APPROVE', 'CANCEL'].includes(decision)) throw new Error('إجراء غير صالح');
    await changeQuoteState(await getAuthContext(), id, version, decision);
    revalidatePath('/dashboard/sales');
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر تحديث العرض' }; }
}

export async function saveSalesSettingsAction(input: unknown) {
  try {
    await saveSalesSettings(await getAuthContext(), input);
    revalidatePath('/dashboard/sales');
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر حفظ الإعدادات' }; }
}

export async function switchSaleToOnlineAction(id: string, version: number) {
  try {
    await switchSaleToOnline(await getAuthContext(), id, version);
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/orders');
    return { success: true as const };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'تعذر التحويل للدفع الإلكتروني' }; }
}
