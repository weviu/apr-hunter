import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import {
  findExchangeKeyByUserAndExchange,
  type Exchange,
} from '@/repositories/exchangeKeyRepository';
import { decrypt } from '@/lib/crypto/encryption';
import { verifyExchangeKey } from '@/lib/exchanges/verifyExchangeKey';

const VALID_EXCHANGES: Exchange[] = ['binance', 'okx', 'kucoin', 'kraken'];

/**
 * Test exchange credentials without persisting them.
 *
 * Two modes:
 *  - New entry: body carries { exchange, apiKey, apiSecret, passphrase? } → test those.
 *  - Saved card: body carries only { exchange } → test the stored (encrypted) keys,
 *    so the user can re-verify a saved connection without re-entering secrets.
 */
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

  // Resolve which credentials to test.
  let creds: { apiKey: string; apiSecret: string; passphrase?: string };

  if (typeof apiKey === 'string' && apiKey.trim()) {
    // New-entry mode — test the supplied values.
    if (typeof apiSecret !== 'string' || !apiSecret.trim()) {
      return err('apiSecret is required', 'VALIDATION_ERROR', 422);
    }
    creds = {
      apiKey,
      apiSecret,
      passphrase: typeof passphrase === 'string' && passphrase ? passphrase : undefined,
    };
  } else {
    // Saved-card mode — test the stored, encrypted keys.
    const stored = await findExchangeKeyByUserAndExchange(session.user.id, exchange as Exchange);
    if (!stored) {
      return err('No saved keys for this exchange', 'NOT_FOUND', 404);
    }
    try {
      creds = {
        apiKey: decrypt(stored.apiKey),
        apiSecret: decrypt(stored.apiSecret),
        passphrase: stored.passphrase ? decrypt(stored.passphrase) : undefined,
      };
    } catch {
      return err('Stored keys could not be read', 'SERVER_ERROR', 500);
    }
  }

  try {
    await verifyExchangeKey(exchange as Exchange, creds.apiKey, creds.apiSecret, creds.passphrase);
  } catch {
    return err('Exchange key verification failed — check your credentials', 'KEY_VERIFICATION_FAILED', 400);
  }

  return ok({ exchange, verified: true });
});
