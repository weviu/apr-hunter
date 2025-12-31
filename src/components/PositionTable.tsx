'use client';

import { Position } from '@/types/portfolio';
import { Trash2, Edit2, History } from 'lucide-react';
import { useState, useMemo } from 'react';

interface PositionRowProps {
  position: Position;
  onEdit?: (position: Position) => void;
  onDelete?: (id: string) => Promise<void>;
  onViewHistory?: (positionId: string) => void;
  isDeleting?: boolean;
  showApr?: boolean;
  portfolioType?: 'web2' | 'web3';
  positionValues?: Record<string, number>; // Symbol -> USD value
}

export function PositionRow({
  position,
  onEdit,
  onDelete,
  onViewHistory,
  isDeleting = false,
  showApr = true,
  portfolioType = 'web2',
  positionValues = {},
}: PositionRowProps) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete || !confirm('Delete this position?')) return;
    try {
      await onDelete(position._id as string);
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    }
  };

  const riskColor =
    position.riskLevel === 'low'
      ? 'text-emerald-400'
      : position.riskLevel === 'medium'
        ? 'text-yellow-400'
        : 'text-red-400';

  const positionValue = positionValues[position.symbol] || 0;

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50">
      <td className="px-8 py-3 text-sm font-medium text-white">{position.symbol}</td>
      <td className="px-8 py-3 text-sm text-gray-400">{position.platform}</td>
      <td className="px-8 py-3 text-sm text-white font-semibold">
        <div>{position.amount.toFixed(4)}</div>
        {positionValue > 0 && (
          <div className="text-xs text-gray-500">(${positionValue.toFixed(2)})</div>
        )}
      </td>
      {showApr && (
        <td className="px-8 py-3 text-sm font-semibold text-emerald-400">
          {position.apr ? `${position.apr.toFixed(2)}%` : '-'}
        </td>
      )}
      <td className={`px-8 py-3 text-sm font-medium ${position.riskLevel ? riskColor : 'text-gray-500'} capitalize`}>
        {position.riskLevel || '-'}
      </td>
      <td className="px-8 py-3 text-sm text-gray-500">
        {portfolioType === 'web2' ? '-' : (position.chain || position.platformType || '-')}
      </td>
      <td className="px-8 py-3">
        <div className="flex items-center justify-start gap-2">
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(position._id as string)}
              className="p-1 text-gray-500 hover:text-blue-400 transition"
              title="View position history"
            >
              <History size={16} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(position)}
              className="p-1 text-gray-500 hover:text-emerald-400 transition"
              title="Edit position"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-gray-500 hover:text-red-400 transition disabled:opacity-50"
              title="Delete position"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface PositionTableProps {
  positions: Position[];
  onEdit?: (position: Position) => void;
  onDelete?: (portfolioId: string, positionId: string) => Promise<void>;
  onViewHistory?: (positionId: string) => void;
  portfolioId?: string;
  isLoading?: boolean;
  portfolioType?: 'web2' | 'web3';
}

export function PositionTable({
  positions,
  onEdit,
  onDelete,
  onViewHistory,
  portfolioId,
  isLoading = false,
  portfolioType = 'web2',
}: PositionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [positionValues, setPositionValues] = useState<Record<string, number>>({});

  // Fetch prices for all positions
  useMemo(() => {
    const fetchPrices = async () => {
      try {
        const uniqueSymbols = [...new Set(positions.map(p => p.symbol))];
        if (uniqueSymbols.length > 0) {
          const priceResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=' +
              uniqueSymbols.map(s => s.toLowerCase()).join(',') +
              '&vs_currencies=usd'
          );

          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            const values: Record<string, number> = {};
            positions.forEach(position => {
              const symbolLower = position.symbol.toLowerCase();
              if (priceData[symbolLower]?.usd) {
                values[position.symbol] = position.amount * priceData[symbolLower].usd;
              }
            });
            setPositionValues(values);
          }
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();
  }, [positions]);

  const handleDelete = async (positionId: string) => {
    if (!onDelete || !portfolioId) return;
    setDeletingId(positionId);
    try {
      await onDelete(portfolioId, positionId);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading positions...</div>;
  }

  if (!positions || positions.length === 0) {
    return <div className="text-center py-8 text-gray-400">No positions yet. Add one to get started.</div>;
  }

  return (
    <div className="overflow-x-auto border border-gray-700 rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Symbol</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Platform</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Amount</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">APR</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Risk</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Chain</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <PositionRow
              key={String(position._id)}
              position={position}
              onEdit={onEdit}
              onDelete={onDelete ? () => handleDelete(position._id as string) : undefined}
              onViewHistory={onViewHistory}
              isDeleting={deletingId === position._id}
              portfolioType={portfolioType}
              positionValues={positionValues}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
