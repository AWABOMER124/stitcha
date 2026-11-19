import { readdir } from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/db/prisma';
export async function isReleaseSchemaReady() {
  const expected=(await readdir(path.join(process.cwd(),'prisma/migrations'),{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name);
  if(!expected.length)throw new Error('Release migration manifest missing');
  const applied=await prisma.$queryRaw<Array<{migration_name:string}>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const names=new Set(applied.map(r=>r.migration_name));
  return expected.every(name=>names.has(name));
}
