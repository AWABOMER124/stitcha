import { manualLogAdapter } from './adapters/manual-log.adapter';
import type { DeliveryProviderAdapter } from './types';

/**
 * Every plugged-in courier/logistics platform, keyed by
 * DeliveryProviderConfig.providerKey. Add a new adapter here once a real
 * provider is chosen — see manual-log.adapter.ts for the interface it must
 * implement.
 */
const adapters: Record<string, DeliveryProviderAdapter> = {
  [manualLogAdapter.key]: manualLogAdapter,
};

export function getAdapter(providerKey: string): DeliveryProviderAdapter | null {
  return adapters[providerKey] ?? null;
}

export function listAdapterKeys(): string[] {
  return Object.keys(adapters);
}
