import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),query:vi.fn()}));
vi.mock('node:fs/promises',()=>({readdir:mocks.read}));vi.mock('@/lib/db/prisma',()=>({default:{$queryRaw:mocks.query}}));
import {isReleaseSchemaReady} from './schema-readiness';
beforeEach(()=>{mocks.read.mockResolvedValue([{name:'base',isDirectory:()=>true},{name:'new',isDirectory:()=>true}]);});
describe('candidate schema readiness',()=>{
 it('does not admit a candidate whose new migration is not applied',async()=>{mocks.query.mockResolvedValue([{migration_name:'base'}]);expect(await isReleaseSchemaReady()).toBe(false);});
 it('admits old code after additive migrations without requiring exact schema equality',async()=>{mocks.query.mockResolvedValue([{migration_name:'base'},{migration_name:'new'},{migration_name:'future_compatible'}]);expect(await isReleaseSchemaReady()).toBe(true);});
 it('fails closed when the image has no migration manifest',async()=>{mocks.read.mockResolvedValue([]);await expect(isReleaseSchemaReady()).rejects.toThrow();});
});
