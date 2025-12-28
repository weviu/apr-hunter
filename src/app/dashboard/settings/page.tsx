'use client';

import { Header } from '@/components/Header';
import { ExchangeKeysSettings } from '@/components/ExchangeKeysSettings';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

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
