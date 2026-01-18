import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import './globals.css';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { AuthProvider } from '@/lib/auth';
import { Web3Provider } from '@/components/Web3Provider';
import { initializeServer } from '@/lib/init-server';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
});

// Initialize server-side services
initializeServer().catch(console.error);

export const metadata: Metadata = {
  title: 'APR Hunter | Lazy Investor Yield Radar',
  description:
    'Surface the most profitable staking, earn, and DeFi opportunities across Binance, OKX, KuCoin, Kraken, Aave, and Yearn with live APR data.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} font-body antialiased`}>
        <AuthProvider>
          <ReactQueryProvider>
            <Web3Provider>
              {children}
            </Web3Provider>
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
