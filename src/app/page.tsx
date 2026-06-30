'use client';

import { Zap, TrendingUp, Database, ArrowRight } from 'lucide-react';
import { AprComparison } from '@/components/apr-comparison';
import { TopOpportunities } from '@/components/top-opportunities';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Card, FadeRise, Stagger, StaggerItem } from '@/components/ui';

const FEATURES = [
  {
    icon: Database,
    title: 'Exchange Earn Feeds',
    body: 'Authenticated data from OKX, KuCoin, and Binance earn layers power these live staking numbers.',
  },
  {
    icon: TrendingUp,
    title: 'Compare Easily',
    body: 'Filter by asset and exchange to see exactly where each earn product stands side-by-side.',
  },
  {
    icon: Zap,
    title: 'Always Fresh',
    body: 'Rates update every 30 seconds and freshness badges highlight how recently each exchange responded.',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <FadeRise className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-4 py-1.5 text-sm text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Live data from OKX, KuCoin &amp; Binance
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Find the best <span className="text-accent">crypto staking</span> rates
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-fg-muted">
              Real staking rates pulled from OKX Earn, KuCoin, and Binance every 30 seconds.
              Compare APR and APY side-by-side so you can stake where it makes sense.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#opportunities"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 font-medium text-accent-fg transition hover:bg-accent-hover"
              >
                View top rates
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href={user ? '/dashboard' : '/register'}
                className="inline-flex h-11 items-center rounded-lg border border-hairline bg-surface px-6 font-medium text-fg transition hover:bg-surface-hover hover:border-hairline-strong"
              >
                {user ? 'Go to Dashboard' : 'Sign Up Free'}
              </Link>
            </div>

            <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-8">
              {[
                ['3', 'Exchanges'],
                ['Real', 'Staking Rates'],
                ['30s', 'Refresh'],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-2xl font-semibold text-fg sm:text-3xl">{value}</div>
                  <div className="text-sm text-fg-muted">{label}</div>
                </div>
              ))}
            </div>
          </FadeRise>
        </div>
      </section>

      {/* What is APR Hunter */}
      <section className="border-y border-hairline bg-surface/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeRise className="mb-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">What is APR Hunter?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-fg-muted">
              APR Hunter collects live staking, savings, and earn rates from OKX, KuCoin, and Binance.
              We highlight the freshest APR/APY data so you can decide where to lock in yield.
            </p>
          </FadeRise>

          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <StaggerItem key={title}>
                <Card interactive className="h-full p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 font-medium text-fg">{title}</h3>
                  <p className="text-sm text-fg-muted">{body}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Top Opportunities */}
      <section id="opportunities" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeRise className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Top APR Opportunities</h2>
            <p className="mt-1 text-fg-muted">Highest yielding staking options across all exchanges</p>
          </FadeRise>
          <TopOpportunities />
        </div>
      </section>

      {/* APR Comparison */}
      <section id="compare" className="border-t border-hairline bg-surface/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeRise className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Compare APR Rates</h2>
            <p className="mt-1 text-fg-muted">Select an asset to see all available staking options</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-fg-faint">
              Data from OKX, KuCoin, and Binance earn; Aave and Yearn DeFi yields. Updated every 30 seconds.
            </p>
          </FadeRise>
          <AprComparison />
        </div>
      </section>

      {/* Coming Soon */}
      <section id="roadmap" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeRise>
            <Card className="border-accent/20 bg-accent-soft p-8 sm:p-12">
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                  More exchanges coming soon
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-fg-muted">
                  We pull live rates from OKX, KuCoin, and Binance, plus DeFi yields from Aave and Yearn.
                  Kraken is next. Sign up so you&apos;ll know as soon as new sources go live.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  {['OKX ✓', 'KuCoin ✓', 'Binance ✓', 'Aave ✓', 'Yearn ✓', 'Kraken (soon)'].map(
                    (label) => (
                      <div
                        key={label}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                          label.includes('✓')
                            ? 'border-accent/30 bg-accent-soft text-accent'
                            : 'border-hairline bg-surface text-fg-muted'
                        }`}
                      >
                        {label}
                      </div>
                    ),
                  )}
                </div>
                {!user && (
                  <div className="mt-8 flex justify-center">
                    <Link
                      href="/register"
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 font-medium text-accent-fg transition hover:bg-accent-hover"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </FadeRise>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-fg-faint sm:px-6 lg:px-8">
          <p>APR Hunter</p>
        </div>
      </footer>
    </div>
  );
}
