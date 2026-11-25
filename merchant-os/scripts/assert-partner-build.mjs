import { readFileSync } from 'node:fs';
const release = process.env.APP_RELEASE;
if (release && release !== 'unknown' && readFileSync('.next/BUILD_ID', 'utf8').trim() !== release) {
  throw new Error('Refusing deployment: navigation build identity differs from APP_RELEASE.');
}
const routes = JSON.parse(readFileSync('.next/server/app-paths-manifest.json', 'utf8'));
for (const route of ['/partner/coverage/page', '/partner/settings/page', '/partner/security/page', '/partner/sandbox/page', '/partner/docs/page']) {
  if (!routes[route]) throw new Error(`Refusing incomplete deployment: missing ${route}. Check Docker build context/ignore rules.`);
}
console.log('Partner portal route manifest verified.');
