import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import {
  findExchangeKeysByUserId,
  upsertExchangeKey,
  deleteExchangeKey,
  type Exchange,
} from '@/repositories/exchangeKeyRepository';
import { encrypt } from '@/lib/crypto/encryption';
import { fetchBinanceAprs } from '@/exchanges/binance';
import { fetchOkxAprs } from '@/exchanges/okx';
import { fetchKucoinAprs } from '@/exchanges/kucoin';
import { fetchKrakenAprs } from '@/exchanges/kraken';

const VALID_EXCHANGES: Exchange[] = ['binance', 'okx', 'kucoin', 'kraken'];

export const GET = withAuth(async (_request: NextRequest, session) => {
  const keys = await findExchangeKeysByUserId(session.user.id);
  const data = keys.map((k) => ({
    exchange: k.exchange,
    hasKey: true,
    lastVerifiedAt: k.lastVerifiedAt?.toISOString() ?? null,
  }));
  return ok(data);
});

export const POST = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { exchange, apiKey, apiSecret, passphrase } = body as Record<string, unknown>;

  if (typeof exchange !== 'string' || !VALID_EXCHANGES.includes(exchange as Exchange)) {
    return err(`exchange must be one of: ${VALID_EXCHANGES.join(', ')}`, 'VALIDATION_ERROR', 422);
  }
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return err('apiKey is required', 'VALIDATION_ERROR', 422);
  }
  if (typeof apiSecret !== 'string' || !apiSecret.trim()) {
    return err('apiSecret is required', 'VALIDATION_ERROR', 422);
  }

  // Verify keys work before saving
  let verifiedAt: Date | null = null;
  try {
    await verifyExchangeKey(exchange as Exchange, apiKey, apiSecret, passphrase as string | undefined);
    verifiedAt = new Date();
  } catch {
    return err('Exchange key verification failed — check your credentials', 'KEY_VERIFICATION_FAILED', 400);
  }

  await upsertExchangeKey(session.user.id, exchange as Exchange, {
    apiKey: encrypt(apiKey),
    apiSecret: encrypt(apiSecret),
    passphrase: typeof passphrase === 'string' && passphrase ? encrypt(passphrase) : null,
    lastVerifiedAt: verifiedAt,
  });

  return ok({ exchange, lastVerifiedAt: verifiedAt?.toISOString() ?? null }, 201);
});

export const DELETE = withAuth(async (request: NextRequest, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400);
  }

  const { exchange } = body as Record<string, unknown>;

  if (typeof exchange !== 'string' || !VALID_EXCHANGES.includes(exchange as Exchange)) {
    return err(`exchange must be one of: ${VALID_EXCHANGES.join(', ')}`, 'VALIDATION_ERROR', 422);
  }

  const deleted = await deleteExchangeKey(session.user.id, exchange as Exchange);
  if (!deleted) return err('Exchange key not found', 'NOT_FOUND', 404);

  return ok({ exchange });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyExchangeKey(
  exchange: Exchange,
  apiKey: string,
  apiSecret: string,
  passphrase?: string,
): Promise<void> {
  switch (exchange) {
    case 'binance':
      await fetchBinanceAprs(apiKey, apiSecret);
      break;
    case 'okx':
      if (!passphrase) throw new Error('passphrase required for OKX');
      await fetchOkxAprs(apiKey, apiSecret, passphrase);
      break;
    case 'kucoin':
      if (!passphrase) throw new Error('passphrase required for KuCoin');
      await fetchKucoinAprs(apiKey, apiSecret, passphrase);
      break;
    case 'kraken':
      await fetchKrakenAprs(); // public — no key needed to verify
      break;
  }
}
