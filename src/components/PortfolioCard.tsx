'use client';

import { Portfolio } from '@/types/portfolio';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';

interface PortfolioCardProps {
  portfolio: Portfolio;
  positionCount?: number;
  totalValue?: number;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
}

export function PortfolioCard({
  portfolio,
  positionCount = 0,
  totalValue,
  onDelete,
  isDeleting = false,
}: PortfolioCardProps) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!onDelete || !confirm('Are you sure? This will delete all positions.')) return;
    try {
      await onDelete(portfolio._id as string);
    } catch (error) {
      alert(`Failed to delete: ${error}`);
    }
  };

  const typeBadge =
    portfolio.type === 'web3'
      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';

  return (
    <Link href={`/dashboard/portfolios/${portfolio._id}`}>
      <div className="block p-6 border border-gray-700 rounded-lg hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition bg-gray-800/50 backdrop-blur">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{portfolio.name}</h3>
            {portfolio.description && (
              <p className="text-sm text-gray-400 mt-1">{portfolio.description}</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="ml-2 p-2 text-gray-500 hover:text-red-400 transition disabled:opacity-50"
            title="Delete portfolio"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeBadge}`}>
            {portfolio.type === 'web3' ? 'Web3' : 'Web2'}
          </span>
          {portfolio.walletAddress && (
            <span className="text-xs text-gray-500 truncate">
              {portfolio.walletAddress.slice(0, 6)}...{portfolio.walletAddress.slice(-4)}
            </span>
          )}
        </div>

        <div className="flex justify-between text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700">
          <span>{positionCount} position{positionCount !== 1 ? 's' : ''}</span>
          {totalValue && <span className="font-medium text-emerald-400">${totalValue.toFixed(2)}</span>}
        </div>
      </div>
    </Link>
  );
}
