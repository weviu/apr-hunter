'use client';

import { Position } from '@/types/portfolio';
import { Trash2, Edit2, History } from 'lucide-react';
import { useState } from 'react';

interface PositionRowProps {
  position: Position;
  onEdit?: (position: Position) => void;
  onDelete?: (id: string) => Promise<void>;
  onViewHistory?: (positionId: string) => void;
  isDeleting?: boolean;
  showApr?: boolean;
  /** Optional map of asset symbol → USD unit price for calculating position value */
  prices?: Record<string, number>;
}

export function PositionRow({
  position,
  onEdit,
  onDelete,
  onViewHistory,
  isDeleting = false,
  showApr = true,
  prices = {},
}: PositionRowProps) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete || !confirm('Delete this position?')) return;
    try {
      await onDelete(position.id);
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    }
  };

  const unitPrice = prices[position.asset] ?? prices[position.asset.toLowerCase()] ?? 0;
  const positionValue = unitPrice > 0 ? position.amount * unitPrice : 0;

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50">
      <td className="px-8 py-3 text-sm font-medium text-white">{position.asset}</td>
      <td className="px-8 py-3 text-sm text-gray-400">{position.exchange}</td>
      <td className="px-8 py-3 text-sm text-white font-semibold">
        <div>{position.amount.toFixed(4)}</div>
        {positionValue > 0 && (
          <div className="text-xs text-gray-500">(${positionValue.toFixed(2)})</div>
        )}
      </td>
      {showApr && (
        <td className="px-8 py-3 text-sm font-semibold text-blue-400">
          {position.aprAtEntry ? `${(position.aprAtEntry * 100).toFixed(2)}%` : '-'}
        </td>
      )}
      <td className="px-8 py-3 text-sm text-gray-500">
        {position.protocol ?? '-'}
      </td>
      <td className="px-8 py-3">
        <div className="flex items-center justify-start gap-2">
          {onViewHistory && (
            <button
              onClick={() => onViewHistory(position.id)}
              className="p-1 text-gray-500 hover:text-blue-400 transition"
              title="View position history"
            >
              <History size={16} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(position)}
              className="p-1 text-gray-500 hover:text-blue-400 transition"
              title="Edit position"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => void handleDelete(e)}
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
  /** Optional map of asset symbol → USD unit price for calculating position value */
  prices?: Record<string, number>;
}

export function PositionTable({
  positions,
  onEdit,
  onDelete,
  onViewHistory,
  portfolioId,
  isLoading = false,
  prices = {},
}: PositionTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Asset</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Exchange</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Amount</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">APR</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Protocol</th>
            <th className="px-8 py-3 text-left text-sm font-semibold text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              onEdit={onEdit}
              onDelete={onDelete ? () => handleDelete(position.id) : undefined}
              onViewHistory={onViewHistory}
              isDeleting={deletingId === position.id}
              prices={prices}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
