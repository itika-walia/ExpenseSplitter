import { execSync } from 'node:child_process';
import { config } from 'dotenv';

/** Recreates the test database schema from the Prisma migrations once per run. */
export default function setup() {
  const testEnv = config({ path: '.env.test' }).parsed;
  const databaseUrl = testEnv?.DATABASE_URL;
  if (!databaseUrl || !/test/i.test(databaseUrl)) {
    throw new Error('Create backend/.env.test with a DATABASE_URL whose name contains "test" (it gets wiped).');
  }
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });
}
