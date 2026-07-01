/**
 * A market-wide trading signal produced by the Python signal-scanner process
 * (signalScanner/scanner.py) and written to the JSON feed that /api/signals reads.
 *
 * Shape matches the scanner's write_to_feed() output exactly. Signals are global
 * (not per-user) — they describe the market, like the Top Opportunities feed.
 */
export interface Signal {
  /** UTC wall-clock time "YYYY-MM-DD HH:MM:SS" (no zone marker). */
  timestamp: string;
  /** cTrader-style symbol, e.g. "SOLUSD", "XAUUSD". */
  symbol: string;
  /** Scanned timeframe, e.g. "15m". */
  timeframe: string;
  direction: 'buy' | 'sell';
  /** Current RSI on the scanned timeframe. */
  rsi: number;
  price: number;
  pivot_level: number | null;
  pivot_distance: number | null;
  /** Model confidence, 0–100. */
  confidence: number;
  /** Suggested stop-loss / take-profit (may be absent). */
  sl: number | null;
  tp: number | null;
  /** BTC macro regime for crypto signals; null for metals. */
  btc_state: string | null;
  signal_source: string;
}
