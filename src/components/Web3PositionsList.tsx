'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DetectedWeb3Position, ProtocolPositionsGroup, getProtocolColorClass } from '@/types/web3';
import { Web3PositionCard } from './Web3PositionCard';

interface Web3PositionsListProps {
  groups: ProtocolPositionsGroup[];
  onImport?: (position: DetectedWeb3Position) => void;
  isLoading?: boolean;
  lastScanned?: string;
}

export function Web3PositionsList({
  groups,
  onImport,
  isLoading = false,
  lastScanned,
}: Web3PositionsListProps) {
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(
    new Set(groups.map((g) => g.protocol))
  );

  const toggleProtocol = (protocol: string) => {
    const newExpanded = new Set(expandedProtocols);
    if (newExpanded.has(protocol)) {
      newExpanded.delete(protocol);
    } else {
      newExpanded.add(protocol);
    }
    setExpandedProtocols(newExpanded);
  };

  const formatTVL = (value: number, decimals: number = 2): string => {
    if (value >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(decimals) + 'K';
    return value.toFixed(decimals);
  };

  if (groups.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">No positions detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.protocol}
          className="border border-gray-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleProtocol(group.protocol)}
            className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-750 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`${getProtocolColorClass(group.protocol)} w-3 h-3 rounded-full`}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-white">{group.protocolName}</h3>
                <p className="text-sm text-gray-400">
                  {group.positions.length} position{group.positions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-white">
                  {formatTVL(group.totalAmount, 0)}
                </p>
                <p className="text-sm text-emerald-400">
                  {group.averageApr.toFixed(2)}% avg APR
                </p>
              </div>
            </div>
            {expandedProtocols.has(group.protocol) ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedProtocols.has(group.protocol) && (
            <div className="bg-gray-900 p-4 space-y-3 border-t border-gray-700">
              {group.positions.map((position, idx) => (
                <Web3PositionCard
                  key={`${position.symbol}-${idx}`}
                  position={position}
                  onImport={onImport}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {lastScanned && (
        <p className="text-xs text-gray-500 text-center pt-2">
          Last scanned: {new Date(lastScanned).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
