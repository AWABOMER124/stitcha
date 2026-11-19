import {describe,it,expect} from 'vitest';
import {providerAddress} from './provider-coverage';
import {qiadPhone} from './partner-protocol';
const q={outboundWebhookUrl:'https://provider.example/api/method/qiad_logistics.wassla_webhooks.receive'};
describe('QIAD actual serviceability and contact contract',()=>{
 it('accepts the three cities and canonicalizes supported aliases',()=>{for(const [city,expected] of [['Khartoum','الخرطوم'],['ام درمان','أم درمان'],['Omdurman','أم درمان'],['بحري','الخرطوم بحري'],['Bahri','الخرطوم بحري']])expect(providerAddress(q,{state:'الخرطوم',city})?.city).toBe(expected);});
 it('rejects outside cities, wrong states and absent state without inventing coverage',()=>{expect(providerAddress(q,{state:'الخرطوم',city:'جبل أولياء'})).toBeNull();expect(providerAddress(q,{state:'كسلا',city:'الخرطوم'})).toBeNull();expect(providerAddress(q,{city:'الخرطوم'})).toBeNull();});
 it('keeps other partner integrations independent of QIAD restrictions',()=>{expect(providerAddress({outboundWebhookUrl:'https://other.example/events'},{state:'البحر الأحمر',city:'بورتسودان'})).toEqual({state:'البحر الأحمر',city:'بورتسودان'});});
 it('matches international and Sudan-local phone normalization',()=>{expect(qiadPhone('091 234 5678')).toBe('+249912345678');expect(qiadPhone('00249912345678')).toBe('+249912345678');expect(qiadPhone('249912345678')).toBe('+249912345678');expect(qiadPhone('+15555550123')).toBe('+15555550123');expect(qiadPhone('abcdefghi')).toBeNull();expect(qiadPhone(null)).toBeNull();});
});
