/**
 * Runs before every test file (via vitest.config.ts setupFiles).
 *
 * Loads the .env file so integration tests have MONGODB_URI available,
 * then sets SKIP_ENV_VALIDATION so env.ts doesn't throw on missing
 * production-only vars during tests.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Don't overwrite vars already set in the process (e.g. from CI)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Must be set before any module imports env.ts
process.env.SKIP_ENV_VALIDATION = 'true';
