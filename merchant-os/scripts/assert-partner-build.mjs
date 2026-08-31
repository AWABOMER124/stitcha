import { readFileSync } from 'node:fs';
const routes = JSON.parse(readFileSync('.next/server/app-paths-manifest.json', 'utf8'));
for (const route of ['/partner/coverage/page', '/partner/settings/page', '/partner/security/page', '/partner/sandbox/page', '/partner/docs/page']) {
  if (!routes[route]) throw new Error(`Refusing incomplete deployment: missing ${route}. Check Docker build context/ignore rules.`);
}
console.log('Partner portal route manifest verified.');
