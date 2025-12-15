'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Asset {
  _id?: string;
  symbol: string;
  name: string;
  marketCap?: number;
  price?: number;
  chains: string[];
  logoUrl?: string;
  description?: string;
}

export default function AssetsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get('/api/assets'),
  });

  const assets: Asset[] = data?.data?.data || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600 dark:text-red-400">
            Failed to load assets. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 mb-6 hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Supported Assets
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div
              key={asset._id || asset.symbol}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {asset.symbol}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {asset.name}
                  </p>
                </div>
              </div>

              {asset.price && (
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${asset.price.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Supported Chains:
                </p>
                <div className="flex flex-wrap gap-2">
                  {asset.chains.map((chain) => (
                    <span
                      key={chain}
                      className="px-2 py-1 text-xs rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 capitalize"
                    >
                      {chain}
                    </span>
                  ))}
                </div>
              </div>

              {asset.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {asset.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {assets.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No assets available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}

