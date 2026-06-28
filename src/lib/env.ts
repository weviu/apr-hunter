/**
 * Typed, Zod-validated environment variables.
 *
 * This is the single place where `process.env` is read. All other modules
 * import from here — never from `process.env` directly.
 *
 * Server-only variables (everything except NEXT_PUBLIC_*) are only available
 * in server components, API routes, and server actions. Next.js strips them
 * from client bundles automatically.
 *
 * Set SKIP_ENV_VALIDATION=true to bypass validation (e.g. in CI steps that
 * run `next build` without a full .env.local).
 */

import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default('apr-hunter-v2'),

  // Auth & Crypto
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, {
    message: 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  }),
  CRON_SECRET: z.string().min(32),

  // Feature flags
  ENABLE_LIVE_EXCHANGE_FETCH: z.enum(['true', 'false']).default('false'),

  // Exchange API keys — all optional; absence means sample data is used
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  OKX_API_KEY: z.string().optional(),
  OKX_API_SECRET: z.string().optional(),
  OKX_PASSPHRASE: z.string().optional(),
  KUCOIN_API_KEY: z.string().optional(),
  KUCOIN_API_SECRET: z.string().optional(),
  KUCOIN_PASSPHRASE: z.string().optional(),

  // Prices
  COINGECKO_API_KEY: z.string().optional(),

  // Web3 (server-side reads for wallet auto-detect)
  RPC_URL_SEPOLIA: z.string().url().optional(),
  DEMO_WALLET_ADDRESS: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1).optional(),
});

// ─── Build & export ──────────────────────────────────────────────────────────

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;
export type Env = ServerEnv & ClientEnv;

function buildEnv(): Env {
  // Allow skipping validation in CI / build steps without a full .env
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return process.env as unknown as Env;
  }

  // Client-side: only validate NEXT_PUBLIC_ vars
  if (typeof window !== 'undefined') {
    const clientResult = clientSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    });
    if (!clientResult.success) {
      throw new Error(
        `[env] Invalid client environment variables:\n${clientResult.error.message}`,
      );
    }
    return clientResult.data as Env;
  }

  // Server-side: validate everything
  const serverResult = serverSchema.safeParse(process.env);
  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  });

  const errors: string[] = [];
  if (!serverResult.success) errors.push(serverResult.error.message);
  if (!clientResult.success) errors.push(clientResult.error.message);

  if (errors.length > 0) {
    throw new Error(`[env] Missing or invalid environment variables:\n${errors.join('\n')}`);
  }

  return {
    ...(serverResult.data as ServerEnv),
    ...(clientResult.data as ClientEnv),
  };
}

export const env = buildEnv();

// ─── Derived helpers ─────────────────────────────────────────────────────────

/** True when live exchange API calls are enabled */
export const isLiveFetchEnabled = env.ENABLE_LIVE_EXCHANGE_FETCH === 'true';
