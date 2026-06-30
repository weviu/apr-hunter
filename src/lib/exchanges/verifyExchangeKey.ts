/**
 * Save-time / on-demand verification of exchange API credentials.
 *
 * Each adapter exposes a dedicated `verifyXKey` that makes a single read-only
 * authenticated call and THROWS on failure (unlike the `fetchXAprs` fetchers,
 * which deliberately swallow errors for the background sync job). This is the
 * source of truth for "are these credentials valid".
 */
import type { Exchange } from '@/repositories/exchangeKeyRepository';
import { verifyBinanceKey } from '@/exchanges/binance';
import { verifyOkxKey } from '@/exchanges/okx';
import { verifyKucoinKey } from '@/exchanges/kucoin';

export class PassphraseRequiredError extends Error {
  constructor(exchange: string) {
    super(`passphrase required for ${exchange}`);
    this.name = 'PassphraseRequiredError';
  }
}

/**
 * Verify credentials against the live exchange API.
 * Resolves if the keys authenticate; throws otherwise.
 */
export async function verifyExchangeKey(
  exchange: Exchange,
  apiKey: string,
  apiSecret: string,
  passphrase?: string,
): Promise<void> {
  switch (exchange) {
    case 'binance':
      await verifyBinanceKey(apiKey, apiSecret);
      break;
    case 'okx':
      if (!passphrase) throw new PassphraseRequiredError('OKX');
      await verifyOkxKey(apiKey, apiSecret, passphrase);
      break;
    case 'kucoin':
      if (!passphrase) throw new PassphraseRequiredError('KuCoin');
      await verifyKucoinKey(apiKey, apiSecret, passphrase);
      break;
    case 'kraken':
      // Kraken is read via public endpoints only — nothing to verify.
      break;
  }
}
