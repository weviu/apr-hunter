import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'production'])
    .default('development'),
  MONGODB_URI: z.string().min(1).url().optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),
  BINANCE_API_KEY: z.string().min(1).optional(),
  BINANCE_API_SECRET: z.string().min(1).optional(),
  OKX_API_KEY: z.string().min(1).optional(),
  OKX_API_SECRET: z.string().min(1).optional(),
  OKX_PASSPHRASE: z.string().min(1).optional(),
  KUCOIN_API_KEY: z.string().min(1).optional(),
  KUCOIN_API_SECRET: z.string().min(1).optional(),
  KUCOIN_PASSPHRASE: z.string().min(1).optional(),
  ENABLE_LIVE_EXCHANGE_FETCH: z
    .enum(['true', 'false'])
    .default('false')
    .optional(),
  ALERT_EVAL_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  BINANCE_API_KEY: process.env.BINANCE_API_KEY,
  BINANCE_API_SECRET: process.env.BINANCE_API_SECRET,
  OKX_API_KEY: process.env.OKX_API_KEY,
  OKX_API_SECRET: process.env.OKX_API_SECRET,
  OKX_PASSPHRASE: process.env.OKX_PASSPHRASE,
  KUCOIN_API_KEY: process.env.KUCOIN_API_KEY,
  KUCOIN_API_SECRET: process.env.KUCOIN_API_SECRET,
  KUCOIN_PASSPHRASE: process.env.KUCOIN_PASSPHRASE,
  ENABLE_LIVE_EXCHANGE_FETCH: process.env.ENABLE_LIVE_EXCHANGE_FETCH ?? 'false',
  ALERT_EVAL_SECRET: process.env.ALERT_EVAL_SECRET,
});
