import {describe,it,expect} from 'vitest';
import {calculateSaudiMerchantShipping as calculate} from './shipping-policy';
describe('confirmed Saudi merchant shipping charges',()=>{
 it.each([[10000,2200],[20000,2400],[50000,3000]])('charges goods %i minor units with COD without including shipping in the percentage',(goods,total)=>{const r=calculate(goods,'COD');expect(r.merchantLogisticsMinor).toBe(total);expect(r.codFeeMinor).toBe(total-2000);expect(r.automaticCustomerChargeMinor).toBe(0);expect(r.platformSalesCommissionMinor+r.partnerMerchantCommissionMinor).toBe(0);});
 it('charges no COD fee for prepaid goods and fixes shipping independently of the goods amount',()=>{expect(calculate(50000,'PREPAID')).toMatchObject({currency:'SAR',shippingMinor:2000,codFeeMinor:0,merchantLogisticsMinor:2000});});
 it('rounds half a halala up without floating point currency conversion',()=>{expect(calculate(1025,'COD').codFeeMinor).toBe(21);expect(calculate(1024,'COD').codFeeMinor).toBe(20);});
 it.each([-1,1.2,NaN,Infinity,Number.MAX_SAFE_INTEGER])('rejects invalid monetary input %s',v=>expect(()=>calculate(v,'COD')).toThrow());
});
