'use client';

import { Header } from '@/components/Header';
import { ExchangeKeysSettings } from '@/components/ExchangeKeysSettings';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWeb3Chains } from '@/lib/hooks/useWeb3Chains';
import { RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedChainIds, availableChains, toggleChain, resetToDefaults } = useWeb3Chains();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your exchange API keys and preferences</p>
        </div>

        <div className="space-y-8">
          {/* Exchange API Keys Section */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <ExchangeKeysSettings />
          </section>

          {/* Web3 Settings Section */}
          {mounted && (
            <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Web3 Settings</h2>
                <p className="text-gray-400">Configure which blockchain networks to scan for Web3 positions</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Chains to Monitor ({selectedChainIds.length} selected)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                  {availableChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => toggleChain(chain.id)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition border ${
                        selectedChainIds.includes(chain.id)
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-gray-300 hover:border-slate-500'
                      }`}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-300">Auto-refresh:</span> Web3 positions are automatically refreshed every 5 minutes when you have an active scan.
                </p>
              </div>
            </section>
          )}

          {/* Placeholder for future settings sections */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
            <p className="text-gray-400">Coming soon...</p>
          </section>
        </div>
      </main>
    </div>
  );
}
