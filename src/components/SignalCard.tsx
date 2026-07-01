'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '@/components/ui';
import type { Signal } from '@/types/signal';

/** Feed timestamps are UTC "YYYY-MM-DD HH:MM:SS" — parse explicitly as UTC. */
function timeAgo(ts: string): string {
  const then = Date.parse(ts.replace(' ', 'T') + 'Z');
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Adaptive precision so both $4,019 gold and sub-dollar alts read sensibly. */
function fmtPrice(n: number | null): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function confidenceStyle(c: number): string {
  if (c >= 80) return 'bg-success-soft text-success';
  if (c >= 60) return 'bg-accent-soft text-accent';
  return 'border border-hairline text-fg-muted';
}

export function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === 'buy';
  const DirIcon = isBuy ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="p-5">
      {/* Header: symbol + direction, price + RSI */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-fg">{signal.symbol}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                isBuy ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              <DirIcon className="h-3 w-3" />
              {signal.direction}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-fg-muted">
            {signal.timeframe} · <span className="text-fg-faint">{timeAgo(signal.timestamp)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-fg">{fmtPrice(signal.price)}</p>
          <p className="text-sm text-fg-faint">RSI {signal.rsi}</p>
        </div>
      </div>

      {/* Footer: confidence + SL/TP */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className={`rounded-full px-2.5 py-1 text-sm font-medium ${confidenceStyle(signal.confidence)}`}>
          {signal.confidence}% confidence
        </span>
        <div className="flex items-center gap-3 text-sm text-fg-muted">
          {signal.sl != null && (
            <span>
              SL <span className="text-danger">{fmtPrice(signal.sl)}</span>
            </span>
          )}
          {signal.tp != null && (
            <span>
              TP <span className="text-success">{fmtPrice(signal.tp)}</span>
            </span>
          )}
        </div>
      </div>

      {signal.btc_state && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-xs capitalize text-fg-faint">
            ₿ {signal.btc_state.replace(/_/g, ' ').toLowerCase()}
          </span>
        </div>
      )}
    </Card>
  );
}
