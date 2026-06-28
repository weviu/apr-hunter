import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { AuthProvider } from '@/lib/auth';
import { Web3Provider } from '@/components/Web3Provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
      <body className={`${inter.variable} font-sans antialiased`}>
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
