const COIN_GECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  LINK: 'chainlink',
  TRX: 'tron',
  XRP: 'ripple',
  TON: 'toncoin',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  AAVE: 'aave',
  UNI: 'uniswap',
  WAVES: 'waves',
};

export async function fetchAssetPrices(assets: string[]): Promise<Record<string, number>> {
  const ids = Array.from(
    new Set(assets.map((asset) => COIN_GECKO_IDS[asset] ?? '').filter(Boolean))
  );

  if (ids.length === 0) return {};

  const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${ids.join(',')}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, { usd?: number } | null>;
  const reverseMap: Record<string, string> = {};
  for (const [symbol, id] of Object.entries(COIN_GECKO_IDS)) {
    reverseMap[id] = symbol;
  }

  const prices: Record<string, number> = {};
  for (const [id, priceObj] of Object.entries(data)) {
    const symbol = reverseMap[id];
    if (!symbol) continue;
    if (priceObj && typeof priceObj === 'object' && typeof priceObj.usd === 'number') {
      prices[symbol] = priceObj.usd;
    }
  }

  return prices;
}

