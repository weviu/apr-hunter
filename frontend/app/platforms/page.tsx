'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PlatformStats {
  _id: string;
  count: number;
  avgApr: number;
  maxApr: number;
  minApr: number;
  platformType: 'exchange' | 'defi';
}

export default function PlatformsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.get('/api/platforms'),
  });

  const platforms: string[] = data?.data?.data?.platforms || [];
  const statistics: PlatformStats[] = data?.data?.data?.statistics || [];

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
            Failed to load platforms. Please try again later.
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
          Supported Platforms
        </h1>

        {/* Platform Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statistics.map((stat) => (
            <div
              key={stat._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {stat._id}
                </h3>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    stat.platformType === 'defi'
                      ? 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300'
                      : 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
                  }`}
                >
                  {stat.platformType.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Assets:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stat.count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg APR:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stat.avgApr.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Max APR:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {stat.maxApr.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Min APR:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stat.minApr.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All Platforms List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            All Platforms ({platforms.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-medium"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

