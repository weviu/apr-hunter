'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, History } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  usePortfolio,
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  usePositionSnapshots,
} from '@/lib/hooks/usePortfolio';
import { PositionTable } from '@/components/PositionTable';
import { PositionForm } from '@/components/PositionForm';
import { PositionHistory } from '@/components/PositionHistory';
import { Position, Portfolio } from '@/types/portfolio';

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const portfolioId = params.id as string;

  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [historyPositionId, setHistoryPositionId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const { data: portfolioData, isLoading: portfolioLoading, error: portfolioError } = usePortfolio(portfolioId, {
    enabled: !!user,
  });
  const { data: positions, isLoading: positionsLoading, error: positionsError } = usePositions(portfolioId, {
    enabled: !!user,
  });
  const { data: snapshots, isLoading: snapshotsLoading } = usePositionSnapshots(
    portfolioId,
    historyPositionId || '',
    { enabled: !!historyPositionId }
  );

  const createMutation = useCreatePosition(portfolioId);
  const updateMutation = useUpdatePosition(portfolioId, editingPosition?._id as string);
  const deleteMutation = useDeletePosition(portfolioId);

  const handleCreatePosition = async (data: any) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdatePosition = async (data: any) => {
    if (!editingPosition) return;
    await updateMutation.mutateAsync(data);
    setEditingPosition(null);
  };

  const handleDeletePosition = async (portfolioId: string, positionId: string) => {
    await deleteMutation.mutateAsync(positionId);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setShowForm(false);
    setHistoryPositionId(null);
  };

  const handleViewHistory = (positionId: string) => {
    setHistoryPositionId(positionId);
    setShowForm(false);
    setEditingPosition(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPosition(null);
    setHistoryPositionId(null);
  };

  if (authLoading) {
    return <div className="p-6 text-center text-gray-400">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (portfolioError) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-500 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
          Failed to load portfolio: {portfolioError.message}
        </div>
      </div>
    );
  }

  if (portfolioLoading) {
    return <div className="p-6 text-center text-gray-400">Loading portfolio...</div>;
  }

  if (!portfolioData || !('portfolio' in portfolioData)) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-500 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded">
          Portfolio not found.
        </div>
      </div>
    );
  }

  const { portfolio, positions: initialPositions, stats } = portfolioData as {
    portfolio: Portfolio;
    positions: Position[];
    stats: any;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-500 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Portfolios
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-gray-400 mt-2">{portfolio.description}</p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                portfolio.type === 'web3' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              }`}>
                {portfolio.type === 'web3' ? 'Web3' : 'Web2'}
              </span>
            </div>
          </div>

          {portfolio.walletAddress && (
            <p className="text-sm text-gray-500">
              Wallet: <span className="font-mono">{portfolio.walletAddress}</span>
            </p>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Total Positions</p>
              <p className="text-2xl font-bold text-white">{stats.totalPositions}</p>
            </div>
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-white">{stats.totalAmount.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="text-sm text-gray-400">Average APR</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.avgApr.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Form Section */}
        {(showForm || editingPosition) && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingPosition ? 'Edit Position' : 'Add Position'}
            </h2>
            {editingPosition ? (
              <PositionForm
                onSubmit={handleUpdatePosition}
                isLoading={updateMutation.isPending}
                onCancel={handleCancelForm}
                portfolioType={portfolio.type}
              />
            ) : (
              <PositionForm
                onSubmit={handleCreatePosition}
                isLoading={createMutation.isPending}
                onCancel={handleCancelForm}
                portfolioType={portfolio.type}
              />
            )}
          </div>
        )}

        {/* Positions Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Positions</h2>
            {!showForm && !editingPosition && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
              >
                <Plus size={20} />
                Add Position
              </button>
            )}
          </div>

          {positionsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded mb-4">
              Failed to load positions: {positionsError.message}
            </div>
          )}

          <PositionTable
            positions={positions || initialPositions || []}
            onEdit={handleEditPosition}
            onDelete={handleDeletePosition}
            onViewHistory={handleViewHistory}
            portfolioId={portfolioId}
            isLoading={positionsLoading}
          />
        </div>

        {/* Position History Section */}
        {historyPositionId && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Position History</h2>
              <button
                onClick={() => setHistoryPositionId(null)}
                className="text-gray-400 hover:text-gray-300 transition text-sm"
              >
                Close
              </button>
            </div>
            <PositionHistory snapshots={snapshots || []} isLoading={snapshotsLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
