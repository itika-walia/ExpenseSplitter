import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Tests run against the database in .env.test, never the development one
const testEnv = config({ path: '.env.test' }).parsed ?? {};

export default defineConfig({
  test: {
    env: { ...testEnv, NODE_ENV: 'test' },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
