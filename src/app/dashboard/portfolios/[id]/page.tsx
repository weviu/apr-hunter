'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  usePortfolio,
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  usePositionSnapshots,
} from '@/hooks/usePortfolio';
import { useWeb3PositionDetection } from '@/hooks/useWeb3PositionDetection';
import { PositionTable } from '@/components/PositionTable';
import { PositionForm } from '@/components/PositionForm';
import { PositionHistory } from '@/components/PositionHistory';
import { Web3PositionsList } from '@/components/Web3PositionsList';
import { Header } from '@/components/Header';
import { Position, Portfolio } from '@/types/portfolio';
import { groupPositionsByProtocol } from '@/types/web3';

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const portfolioIdParam = params?.id;
  const portfolioId = Array.isArray(portfolioIdParam) ? portfolioIdParam[0] : (portfolioIdParam ?? '');

  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [historyPositionId, setHistoryPositionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'web3'>('positions');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    error: portfolioError,
  } = usePortfolio(portfolioId, { enabled: !!user && !!portfolioId });

  const {
    data: positions,
    isLoading: positionsLoading,
    error: positionsError,
  } = usePositions(portfolioId, { enabled: !!user && !!portfolioId });

  const { data: snapshots } = usePositionSnapshots(portfolioId, historyPositionId ?? '', {
    enabled: !!historyPositionId && !!portfolioId,
  });

  const { data: web3Positions } = useWeb3PositionDetection();

  const createMutation = useCreatePosition(portfolioId);
  const updateMutation = useUpdatePosition(portfolioId, editingPosition?.id ?? '');
  const deleteMutation = useDeletePosition(portfolioId);

  const handleCreatePosition = async (data: {
    asset: string;
    exchange: string;
    amount: number;
    aprAtEntry: number;
    protocol?: string | null;
    chainId?: number | null;
    walletAddress?: string | null;
    notes?: string | null;
  }) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdatePosition = async (data: {
    asset: string;
    exchange: string;
    amount: number;
    aprAtEntry: number;
    protocol?: string | null;
    chainId?: number | null;
    walletAddress?: string | null;
    notes?: string | null;
  }) => {
    if (!editingPosition) return;
    await updateMutation.mutateAsync(data);
    setEditingPosition(null);
  };

  const handleDeletePosition = async (_portfolioId: string, positionId: string) => {
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
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!portfolioId) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="p-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <ArrowLeft size={20} /> Back
          </button>
          <p className="text-yellow-400">Invalid portfolio ID.</p>
        </div>
      </div>
    );
  }

  if (portfolioError) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="p-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <ArrowLeft size={20} /> Back
          </button>
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
            Failed to load portfolio: {portfolioError.message}
          </div>
        </div>
      </div>
    );
  }

  if (portfolioLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="p-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <ArrowLeft size={20} /> Back
          </button>
          <p className="text-yellow-400">Portfolio not found.</p>
        </div>
      </div>
    );
  }

  const isPortfolioBundle =
    typeof portfolioData === 'object' &&
    portfolioData !== null &&
    'portfolio' in portfolioData;

  const portfolio = isPortfolioBundle
    ? (portfolioData as { portfolio: Portfolio }).portfolio
    : (portfolioData as Portfolio);

  if (!portfolio?.id) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="p-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <ArrowLeft size={20} /> Back
          </button>
          <p className="text-yellow-400">Portfolio not found.</p>
        </div>
      </div>
    );
  }

  const initialPositions = isPortfolioBundle ? (portfolioData as { positions?: Position[] }).positions ?? [] : [];
  const stats = isPortfolioBundle ? (portfolioData as { stats?: Record<string, number> }).stats : undefined;

  const groupedWeb3 = web3Positions ? groupPositionsByProtocol(web3Positions) : [];
  const positionList = positions ?? initialPositions ?? [];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Portfolios
          </button>

          {/* Portfolio header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">{portfolio.name}</h1>
            {portfolio.description && (
              <p className="text-gray-400 mt-2">{portfolio.description}</p>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Total Positions</p>
                <p className="text-2xl font-bold text-white">{stats.totalPositions ?? 0}</p>
              </div>
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Total Value (USD)</p>
                <p className="text-2xl font-bold text-white">${(stats.totalValue ?? 0).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Average APR</p>
                <p className="text-2xl font-bold text-blue-400">
                  {((stats.avgApr ?? 0) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {/* Position form */}
          {(showForm || editingPosition) && (
            <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingPosition ? 'Edit Position' : 'Add Position'}
              </h2>
              <PositionForm
                onSubmit={editingPosition ? handleUpdatePosition : handleCreatePosition}
                isLoading={editingPosition ? updateMutation.isPending : createMutation.isPending}
                onCancel={handleCancelForm}
              />
            </div>
          )}

          {/* Position history */}
          {historyPositionId && snapshots && (
            <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Position History</h2>
                <button
                  onClick={() => setHistoryPositionId(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕ Close
                </button>
              </div>
              <PositionHistory snapshots={snapshots} />
            </div>
          )}

          {/* Tabs */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'positions'
                    ? 'border-blue-700 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Positions ({positionList.length})
              </button>
              <button
                onClick={() => setActiveTab('web3')}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  activeTab === 'web3'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Web3 Detected ({groupedWeb3.length > 0 ? groupedWeb3.reduce((s, g) => s + g.positions.length, 0) : 0})
              </button>
            </div>

            {activeTab === 'positions' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Positions</h2>
                  {!showForm && !editingPosition && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-medium transition"
                    >
                      <Plus size={20} />
                      Add Position
                    </button>
                  )}
                </div>

                {positionsError && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
                    Failed to load positions: {positionsError.message}
                  </div>
                )}

                <PositionTable
                  positions={positionList}
                  isLoading={positionsLoading}
                  onEdit={handleEditPosition}
                  onDelete={handleDeletePosition}
                  onViewHistory={handleViewHistory}
                  portfolioId={portfolioId}
                />
              </>
            )}

            {activeTab === 'web3' && (
              <>
                <h2 className="text-xl font-semibold text-white mb-4">Detected Web3 Positions</h2>
                {groupedWeb3.length > 0 ? (
                  <Web3PositionsList
                    groups={groupedWeb3}
                    isLoading={false}
                  />
                ) : (
                  <p className="text-gray-400 text-center py-8">
                    No Web3 positions detected. Use the scanner from the dashboard to scan your wallet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
