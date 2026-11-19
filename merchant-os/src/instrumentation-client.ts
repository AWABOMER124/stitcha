import { deploymentAwareFetch } from '@/lib/deployment-guard';

const release = process.env.NEXT_PUBLIC_DEPLOYMENT_RELEASE;
if (release && release !== 'unknown') window.fetch = deploymentAwareFetch(window.fetch.bind(window), release, () => window.dispatchEvent(new Event('wasla:deployment-changed')));
