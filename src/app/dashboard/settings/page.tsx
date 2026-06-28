'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Header } from '@/components/Header';
import { ExchangeKeysSettings } from '@/components/ExchangeKeysSettings';
import { useAuth } from '@/lib/auth';
import { useWeb3Chains } from '@/hooks/useWeb3Chains';
import { Card, FadeRise, Stagger, StaggerItem } from '@/components/ui';

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <FadeRise className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
          <p className="mt-1 text-sm text-fg-muted">Manage your exchange API keys and preferences.</p>
        </FadeRise>

        <Stagger className="space-y-6">
          {/* Exchange API Keys */}
          <StaggerItem>
            <Card className="p-6">
              <ExchangeKeysSettings />
            </Card>
          </StaggerItem>

          {/* Web3 Settings */}
          {mounted && (
            <StaggerItem>
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-fg">Web3 Settings</h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    Configure which blockchain networks to scan for Web3 positions.
                  </p>
                </div>

                <label className="mb-3 block text-sm font-medium text-fg-muted">
                  Chains to monitor ({selectedChainIds.length} selected)
                </label>
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {availableChains.map((chain) => {
                    const selected = selectedChainIds.includes(chain.id);
                    return (
                      <button
                        key={chain.id}
                        onClick={() => toggleChain(chain.id)}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                          selected
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-hairline bg-surface text-fg-muted hover:border-hairline-strong hover:text-fg'
                        }`}
                      >
                        {chain.name}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={resetToDefaults}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-fg-muted transition hover:bg-surface-hover hover:text-fg"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to defaults
                </button>

                <div className="mt-6 rounded-lg border border-hairline bg-canvas p-4">
                  <p className="text-xs text-fg-muted">
                    <span className="font-medium text-fg">Auto-refresh:</span> Web3 positions are
                    automatically refreshed every 5 minutes when you have an active scan.
                  </p>
                </div>
              </Card>
            </StaggerItem>
          )}

          {/* Notifications placeholder */}
          <StaggerItem>
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-fg">Notifications</h2>
              <p className="mt-1 text-sm text-fg-muted">Coming soon…</p>
            </Card>
          </StaggerItem>
        </Stagger>
      </main>
    </div>
  );
}
