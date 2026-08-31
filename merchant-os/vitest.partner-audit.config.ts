import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Opt-in acceptance audit. Known failures are intentionally NOT part of CI.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['audit/delivery-partner.audit.ts'],
    fileParallelism: false,
    testTimeout: 90000,
    hookTimeout: 90000,
  },
});
