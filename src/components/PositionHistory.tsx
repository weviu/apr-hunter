'use client';

import { PositionSnapshot } from '@/types/portfolio';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionHistoryProps {
  snapshots: PositionSnapshot[];
  isLoading?: boolean;
}

export function PositionHistory({ snapshots, isLoading }: PositionHistoryProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading history...</div>;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No history yet. Position snapshots will appear as you make changes.
      </div>
    );
  }

  // Sort snapshots by date (newest first)
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedSnapshots.map((snapshot, index) => {
        const prevSnapshot = sortedSnapshots[index + 1];
        const amountChange =
          prevSnapshot && snapshot.amount !== prevSnapshot.amount
            ? snapshot.amount - prevSnapshot.amount
            : null;
        const aprChange =
          prevSnapshot && snapshot.apr !== prevSnapshot.apr
            ? snapshot.apr - prevSnapshot.apr
            : null;

        const date = new Date(snapshot.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={snapshot._id?.toString() || index}
            className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-white">{formattedDate}</p>
                  <p className="text-xs text-gray-500">{formattedTime}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                {snapshot.type || 'Initial'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="text-sm font-semibold text-white">{snapshot.amount.toFixed(6)}</p>
                {amountChange !== null && (
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${
                      amountChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {amountChange >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {amountChange > 0 ? '+' : ''}
                    {amountChange.toFixed(6)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">APR</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {snapshot.apr ? `${snapshot.apr.toFixed(2)}%` : '-'}
                </p>
                {aprChange !== null && (
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${
                      aprChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {aprChange >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {aprChange > 0 ? '+' : ''}
                    {aprChange.toFixed(2)}%
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <p className="text-sm font-semibold text-white capitalize">
                  {snapshot.riskLevel || '-'}
                </p>
              </div>
            </div>

            {snapshot.notes && (
              <p className="text-xs text-gray-400 mt-3 italic">
                Note: {snapshot.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
