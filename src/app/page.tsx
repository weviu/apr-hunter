import { Zap, TrendingUp, Database, ArrowRight } from 'lucide-react';
import { AprComparison } from '@/components/apr-comparison';
import { TopOpportunities } from '@/components/top-opportunities';
import { Header } from '@/components/Header';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"></div>
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live data from OKX, KuCoin & Binance
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Find the Best{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Crypto Staking
              </span>{' '}
              Rates
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Real staking rates pulled from OKX Earn, KuCoin, and Binance feeds every 30 seconds.
              Compare APR and APY side-by-side so you can stake where it makes sense.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a
                href="#opportunities"
                className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center gap-2"
              >
                View Top Rates
                <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-lg border border-gray-600 hover:border-emerald-500 text-gray-300 hover:text-white font-semibold transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">3</div>
                <div className="text-sm text-gray-500">Exchanges</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">Real</div>
                <div className="text-sm text-gray-500">Staking Rates</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">30s</div>
                <div className="text-sm text-gray-500">Refresh</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is APR Hunter Section */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              What is APR Hunter?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              APR Hunter is an informational hub that collects live staking, savings, and earn rates from OKX, KuCoin, and Binance.
              We highlight the freshest APR/APY data so you can decide where to lock in yield.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Exchange Earn Feeds
              </h3>
              <p className="text-gray-400">
                Authenticated data from OKX, KuCoin, and Binance earn layers power these live staking numbers.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Compare Easily
              </h3>
              <p className="text-gray-400">
                Filter by asset, lock period, and risk level so you know exactly where each exchange earn product stands.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Always Fresh
              </h3>
              <p className="text-gray-400">
                Rates update every 30 seconds and freshness badges highlight how recently OKX responded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Opportunities */}
      <section id="opportunities" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Top APR Opportunities
              </h2>
              <p className="text-gray-400">
                Highest yielding staking options across all exchanges
              </p>
            </div>
          </div>
          <TopOpportunities />
        </div>
      </section>

      {/* APR Comparison */}
      <section id="compare" className="py-16 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Compare APR Rates
            </h2>
            <p className="text-gray-400 mb-2">
              Select an asset to see all available staking options
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Data sourced from OKX Earn, KuCoin Earn, and Binance Simple Earn. Real staking rates, updated every 30 seconds.
            </p>
          </div>
          <AprComparison />
        </div>
      </section>

      {/* Coming Soon Section */}
      <section id="roadmap" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-8 sm:p-12">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                More Exchanges Coming Soon
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                We already pull from OKX Earn, KuCoin, and Binance; next up are Kraken and select DeFi protocols.
                Sign up for alerts so you’ll know as soon as new sources go live.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                  OKX ✓
                </div>
                <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                  KuCoin ✓
                </div>
                <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                  Binance ✓
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Kraken
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Aave
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-bold text-white">APR Hunter</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 APR Hunter. Data is for informational purposes only.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Data from OKX Earn, KuCoin Earn, Binance Simple Earn</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
