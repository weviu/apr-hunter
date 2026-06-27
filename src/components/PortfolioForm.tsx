'use client';

import { useState } from 'react';

interface PortfolioFormProps {
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function PortfolioForm({ onSubmit, isLoading = false, onCancel }: PortfolioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
          Portfolio Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          placeholder="e.g., My Binance Staking"
          className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:opacity-50 placeholder-gray-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          placeholder="Add notes about this portfolio..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:opacity-50 resize-none placeholder-gray-500"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg disabled:opacity-50 font-medium transition"
        >
          {isLoading ? 'Creating...' : 'Create Portfolio'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-700 text-white hover:bg-gray-800 rounded-lg disabled:opacity-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
