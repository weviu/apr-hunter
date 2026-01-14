'use client';

import { DetectedWeb3Position, getProtocolColorClass } from '@/types/web3';

interface Web3PositionCardProps {
  position: DetectedWeb3Position;
  onImport?: (position: DetectedWeb3Position) => void;
  isLoading?: boolean;
}

export function Web3PositionCard({
  position,
  onImport,
  isLoading = false,
}: Web3PositionCardProps) {
  const formatValue = (value: number, decimals: number = 2): string => {
    if (value >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(decimals) + 'K';
    return value.toFixed(decimals);
  };

  const getProtocolLabel = (type: string): string => {
    const labels: Record<string, string> = {
      yearn: 'Yearn',
      aave: 'Aave',
      erc20: 'ERC20',
      lido: 'Lido',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`${getProtocolColorClass(position.detectionType)} w-2 h-2 rounded-full`}
            />
            <h3 className="font-semibold text-white">{position.symbol}</h3>
            <span className="text-xs text-gray-400">
              {getProtocolLabel(position.detectionType)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Amount</p>
              <p className="text-white font-medium">
                {formatValue(position.amount, 2)} {position.asset}
              </p>
            </div>
            <div>
              <p className="text-gray-400">APR</p>
              <p className="text-white font-medium">
                {position.apr.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Chain</p>
              <p className="text-white font-medium">{position.chain}</p>
            </div>
            <div>
              <p className="text-gray-400">Platform</p>
              <p className="text-white font-medium text-xs">
                {position.platform}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Updated {new Date(position.lastUpdated).toLocaleTimeString()}
          </p>
        </div>

        {onImport && (
          <button
            onClick={() => onImport(position)}
            disabled={isLoading}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded font-medium transition whitespace-nowrap"
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        )}
      </div>
    </div>
  );
}
