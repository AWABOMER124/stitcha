import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['audit/store-affiliates.audit.ts'], fileParallelism: false, testTimeout: 90000, hookTimeout: 90000 },
});
