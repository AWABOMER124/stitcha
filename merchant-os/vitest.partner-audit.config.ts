import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Opt-in acceptance audit requiring the isolated local PostgreSQL and Next server.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['audit/delivery-partner.audit.ts', 'audit/partner-portal.audit.ts'],
    fileParallelism: false,
    testTimeout: 90000,
    hookTimeout: 90000,
  },
});
