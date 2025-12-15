import { Search, Shield, Zap, TrendingUp, Database, Bell, ArrowRight } from 'lucide-react';
import { AprComparison } from '@/components/AprComparison';
import { TopOpportunities } from '@/components/TopOpportunities';
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
              Live data from OKX • More exchanges coming soon
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Find the Best{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Crypto Staking
              </span>{' '}
              Rates
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Compare APR and APY rates across exchanges in real-time. 
              Make informed decisions about where to stake your crypto assets.
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
                href="/register"
                className="px-8 py-3 rounded-lg border border-gray-600 hover:border-emerald-500 text-gray-300 hover:text-white font-semibold transition-colors"
              >
                Create Account
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">1</div>
                <div className="text-sm text-gray-500">Exchange</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
                <div className="text-sm text-gray-500">Assets</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white">30s</div>
                <div className="text-sm text-gray-500">Refresh Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is APR Finder Section */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              What is APR Finder?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              APR Finder is a real-time aggregator that collects and displays staking, savings, 
              and earn rates from cryptocurrency exchanges. We help you find where your crypto 
              can earn the highest yields.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 backdrop-blur p-6 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Real Data
              </h3>
              <p className="text-gray-400">
                We pull live data directly from exchange APIs. No fake numbers or outdated information.
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
                See all rates side-by-side. Filter by asset, lock period, and risk level to find your perfect match.
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
                Data refreshes every 30 seconds. See freshness indicators to know exactly how current the rates are.
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
                Highest yielding staking options right now on OKX
              </p>
            </div>
          </div>
          <TopOpportunities />
        </div>
      </section>

      {/* APR Comparison */}
      <section className="py-16 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Compare APR Rates
            </h2>
            <p className="text-gray-400">
              Select an asset to see all available staking options
            </p>
          </div>
          <AprComparison />
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-8 sm:p-12">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                More Exchanges Coming Soon
              </h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                We're working on adding data from Binance, KuCoin, Bybit, Kraken, and DeFi protocols 
                like Aave, Compound, and Lido. Create an account to be notified when we add new sources.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Binance
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  KuCoin
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Bybit
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Kraken
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Aave
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400">
                  Lido
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
              <span className="text-lg font-bold text-white">APR Finder</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 APR Finder. Data is for informational purposes only.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="https://www.okx.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500">
                Data from OKX
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
