'use server';

import { getAuthContext, requirePermission } from '@/lib/permissions';
import * as whatsappChannelService from './services/whatsapp-channel.service';
import { saveWhatsAppConfigSchema } from './schemas/whatsapp-channel.schemas';
import type { ActionResult } from '@/lib/types';

// ============================================================================
// WhatsApp Channel Module — Server Actions
// ============================================================================

export async function getWhatsAppConfigAction(): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'settings:read');
    const config = await whatsappChannelService.getConfig(auth.merchantId);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get WhatsApp config' };
  }
}

export async function saveWhatsAppConfigAction(formData: unknown): Promise<ActionResult<unknown>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'settings:update');
    const parsed = saveWhatsAppConfigSchema.parse(formData);
    const config = await whatsappChannelService.saveConfig(auth.merchantId, parsed);
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save WhatsApp config' };
  }
}

export async function removeWhatsAppConfigAction(): Promise<ActionResult<null>> {
  try {
    const auth = await getAuthContext();
    requirePermission(auth, 'settings:update');
    await whatsappChannelService.removeConfig(auth.merchantId);
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove WhatsApp config' };
  }
}
