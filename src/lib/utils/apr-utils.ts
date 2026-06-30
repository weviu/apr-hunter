/** Shared APR display utilities. */

export const PLATFORM_LINKS: Record<string, string> = {
  okx: 'https://www.okx.com/earn',
  binance: 'https://www.binance.com/en/earn',
  kucoin: 'https://www.kucoin.com/earn',
  kraken: 'https://www.kraken.com/learn/what-is-crypto-staking',
  aave: 'https://app.aave.com',
  yearn: 'https://yearn.fi/vaults',
};

export function formatApr(apr: number): string {
  return (apr * 100).toFixed(2) + '%';
}

export function getProductLabel(source?: string): string {
  if (!source) return 'Earn';
  const s = source.toLowerCase();
  if (s.includes('staking')) return 'Staking';
  if (s.includes('locked')) return 'Locked';
  if (s.includes('lending') || s.includes('supply')) return 'Lending';
  if (s.includes('vault')) return 'Vault';
  return 'Earn';
}

/** DeFi protocols vs centralized exchanges — drives the CEX/DeFi badge. */
const DEFI_EXCHANGES = new Set(['aave', 'yearn']);

export function getExchangeType(exchange: string): 'CEX' | 'DeFi' {
  return DEFI_EXCHANGES.has(exchange.toLowerCase()) ? 'DeFi' : 'CEX';
}

/** Returns a human-readable freshness label based on a UTC ISO timestamp. */
export function getFreshness(lastUpdated?: string, source?: string): {
  label: string;
  color: string;
  dotColor: string;
} {
  // Sample/demo fixtures are re-stamped with a fresh syncedAt every sync cycle,
  // so they'd otherwise read as "Live". Label them honestly regardless of age.
  if (source === 'sample') {
    return { label: 'Sample data', color: 'text-yellow-500', dotColor: 'bg-yellow-500' };
  }

  if (!lastUpdated) return { label: 'Unknown', color: 'text-gray-400', dotColor: 'bg-gray-400' };

  const diffMinutes = Math.floor(
    (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60),
  );

  if (diffMinutes < 5)   return { label: 'Live',           color: 'text-green-500',  dotColor: 'bg-green-500' };
  if (diffMinutes < 30)  return { label: `${diffMinutes}m ago`, color: 'text-green-400',  dotColor: 'bg-green-400' };
  if (diffMinutes < 60)  return { label: `${diffMinutes}m ago`, color: 'text-yellow-500', dotColor: 'bg-yellow-500' };
  if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { label: `${hours}h ago`, color: 'text-orange-500', dotColor: 'bg-orange-500' };
  }
  const days = Math.floor(diffMinutes / 1440);
  return { label: `${days}d ago`, color: 'text-red-500', dotColor: 'bg-red-500' };
}
