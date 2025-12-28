'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio } from '@/lib/hooks/usePortfolio';
import { PortfolioCard } from '@/components/PortfolioCard';
import { PortfolioForm } from '@/components/PortfolioForm';

export default function PortfoliosPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const { data: portfolios, isLoading, error } = usePortfolios({ enabled: !!user });
  const createMutation = useCreatePortfolio();
  const deleteMutation = useDeletePortfolio();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleDelete = async (portfolioId: string) => {
    await deleteMutation.mutateAsync(portfolioId);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          Failed to load portfolios: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Portfolios</h1>
          <p className="text-gray-400 mt-2">Manage your investment portfolios and track positions.</p>
        </div>

        {showForm && (
          <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Create Portfolio</h2>
            <PortfolioForm
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {!showForm && (
          <div className="mb-8">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
            >
              <Plus size={20} />
              New Portfolio
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading portfolios...</div>
        ) : portfolios && portfolios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio._id as string}
                portfolio={portfolio}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No portfolios yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              <Plus size={20} />
              Create Your First Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
