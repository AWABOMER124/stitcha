import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({billing:vi.fn(),cron:vi.fn()}));
vi.mock('@/modules/finance/services/subscription-billing.service',()=>({runSubscriptionBilling:mocks.billing}));
vi.mock('node-cron',()=>({schedule:mocks.cron}));
import {register} from '../../../instrumentation';
afterEach(()=>vi.unstubAllEnvs());
describe('side-effect free web startup',()=>{it('never creates a billing run or per-instance cron when a candidate boots',async()=>{vi.stubEnv('NEXT_RUNTIME','nodejs');await register();await register();expect(mocks.billing).not.toHaveBeenCalled();expect(mocks.cron).not.toHaveBeenCalled();});});
