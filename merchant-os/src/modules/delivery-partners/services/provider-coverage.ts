import { normalizePlace } from '@/lib/geography/regional-coverage';
import { isQiadIntegration } from './partner-protocol';
export const QIAD_CITIES = ['الخرطوم','أم درمان','الخرطوم بحري'] as const;
const aliases = new Map([
 ['الخرطوم','الخرطوم'],['khartoum','الخرطوم'],['أم درمان','أم درمان'],['ام درمان','أم درمان'],['omdurman','أم درمان'],['om durman','أم درمان'],['بحري','الخرطوم بحري'],['الخرطوم بحري','الخرطوم بحري'],['bahri','الخرطوم بحري'],['khartoum north','الخرطوم بحري'],
].map(([a,b])=>[normalizePlace(a),b]));
export function providerAddress<T extends { state?: string | null; city: string | null }>(config: { outboundWebhookUrl?: string | null } | null | undefined, address: T): T | null {
 if (!isQiadIntegration(config?.outboundWebhookUrl)) return address;
 const city=aliases.get(normalizePlace(address.city));
 if (!city || normalizePlace(address.state)!==normalizePlace('الخرطوم')) return null;
 return {...address,city};
}
