/**
 * Curated allowlist of assets worth surfacing.
 *
 * The CEX earn catalogs (Binance/KuCoin/OKX) list hundreds of micro-cap and
 * meme tokens (e.g. 1000CHEEMS) whose high APRs reflect risk/illiquidity, not
 * opportunity. We keep only these recognised assets for CEX rows.
 *
 * DeFi protocol rows (Aave/Yearn) are NOT filtered by this list  they're
 * already a small, curated set, and Yearn reports vault-token symbols that
 * wouldn't match a clean asset allowlist. See shouldTrackSnapshot().
 */

// Symbols are compared uppercased.
export const TRACKED_ASSETS = new Set<string>([
  // ── Stablecoins ──────────────────────────────────────────────────────────
  'USDT', 'USDC', 'DAI', 'FDUSD', 'USDE', 'PYUSD', 'TUSD', 'USDS',
  'CRVUSD', 'GHO', 'SUSD', 'LUSD', 'RLUSD', 'USDP', 'GUSD', 'USDD',

  // ── Majors / L1s & L2s ───────────────────────────────────────────────────
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'POL', 'MATIC',
  'LINK', 'ATOM', 'NEAR', 'TRX', 'LTC', 'BCH', 'UNI', 'AAVE', 'ARB', 'OP',
  'APT', 'SUI', 'TON', 'FIL', 'INJ', 'TIA', 'SEI', 'LDO', 'CRV', 'MKR',
  'ALGO', 'XLM', 'HBAR', 'ICP', 'ETC', 'DOGE', 'SHIB', 'RENDER', 'RNDR',
  'ONDO', 'ENA', 'PENDLE', 'JUP', 'WLD', 'STX', 'GRT', 'IMX', 'FET', 'ENS',
  'DYDX',

  // ── Liquid staking / wrapped majors ──────────────────────────────────────
  'STETH', 'WSTETH', 'RETH', 'CBETH', 'WEETH', 'WETH', 'WBTC', 'CBBTC',
]);

/** DeFi protocols are exempt from the allowlist (already curated). */
const DEFI_EXCHANGES = new Set(['aave', 'yearn']);

/**
 * Whether a snapshot should be kept: all DeFi rows pass; CEX earn rows are kept
 * only if the asset is on the allowlist.
 */
export function shouldTrackSnapshot(exchange: string, asset: string): boolean {
  if (DEFI_EXCHANGES.has(exchange.toLowerCase())) return true;
  return TRACKED_ASSETS.has(asset.toUpperCase());
}
