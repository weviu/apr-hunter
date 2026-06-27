'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio } from '@/hooks/usePortfolio';
import { PortfolioCard } from '@/components/PortfolioCard';
import { PortfolioForm } from '@/components/PortfolioForm';
import { Header } from '@/components/Header';

export default function PortfoliosPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const { data: portfolios = [], isLoading, error } = usePortfolios({ enabled: !!user });
  const createMutation = useCreatePortfolio();
  const deleteMutation = useDeletePortfolio();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

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

  const handleCreate = async (data: { name: string; description?: string }) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleDelete = async (portfolioId: string) => {
    await deleteMutation.mutateAsync(portfolioId);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">My Portfolios</h1>
            <p className="text-gray-400 mt-2">Manage your investment portfolios and track positions.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
              Failed to load portfolios: {error.message}
            </div>
          )}

          {showForm ? (
            <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Create Portfolio</h2>
              <PortfolioForm
                onSubmit={handleCreate}
                isLoading={createMutation.isPending}
                onCancel={() => setShowForm(false)}
              />
            </div>
          ) : (
            <div className="mb-8">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-medium transition"
              >
                <Plus size={20} />
                New Portfolio
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading portfolios...</div>
          ) : portfolios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((portfolio) => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === portfolio.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">No portfolios yet. Create one to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
