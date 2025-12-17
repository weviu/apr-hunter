/**
 * Database setup script
 * Run with: tsx src/scripts/seed-sample-data.ts
 * 
 * This script:
 * 1. Clears old APR data
 * 2. Seeds asset information
 * 3. The dataCollector will fetch real APR rates from exchanges
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { AssetDocument } from '../models/Asset';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'apr_finder';

// Comprehensive list of assets supported by major exchanges
const assets: AssetDocument[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    marketCap: 1900000000000,
    price: 97000,
    chains: ['bitcoin', 'ethereum', 'bsc'],
    description: 'The first and largest cryptocurrency by market cap',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    marketCap: 450000000000,
    price: 3700,
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    description: 'The leading smart contract platform',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    marketCap: 140000000000,
    price: 1,
    chains: ['ethereum', 'tron', 'bsc', 'polygon', 'solana'],
    description: 'The largest stablecoin by market cap',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    marketCap: 42000000000,
    price: 1,
    chains: ['ethereum', 'solana', 'polygon', 'arbitrum', 'base'],
    description: 'A fully-reserved stablecoin by Circle',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    marketCap: 95000000000,
    price: 640,
    chains: ['bsc'],
    description: 'Binance ecosystem native token',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    marketCap: 110000000000,
    price: 235,
    chains: ['solana'],
    description: 'High-performance blockchain for DeFi and NFTs',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    marketCap: 140000000000,
    price: 2.45,
    chains: ['ripple'],
    description: 'Digital payment protocol and cryptocurrency',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    marketCap: 38000000000,
    price: 1.08,
    chains: ['cardano'],
    description: 'Proof-of-stake blockchain platform',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    marketCap: 60000000000,
    price: 0.41,
    chains: ['dogecoin'],
    description: 'The original meme cryptocurrency',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    marketCap: 20000000000,
    price: 48,
    chains: ['avalanche'],
    description: 'Fast, low-cost smart contract platform',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    marketCap: 12000000000,
    price: 9.2,
    chains: ['polkadot'],
    description: 'Multi-chain interoperability protocol',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    marketCap: 5000000000,
    price: 0.62,
    chains: ['polygon', 'ethereum'],
    description: 'Ethereum scaling solution',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    marketCap: 4500000000,
    price: 11.5,
    chains: ['cosmos'],
    description: 'Internet of blockchains ecosystem',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'TRX',
    name: 'TRON',
    marketCap: 22000000000,
    price: 0.26,
    chains: ['tron'],
    description: 'Decentralized content sharing platform',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'TON',
    name: 'Toncoin',
    marketCap: 14000000000,
    price: 5.6,
    chains: ['ton'],
    description: 'The Open Network blockchain',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'KCS',
    name: 'KuCoin Token',
    marketCap: 1000000000,
    price: 10.5,
    chains: ['ethereum'],
    description: 'KuCoin exchange native token',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    marketCap: 15000000000,
    price: 24,
    chains: ['ethereum'],
    description: 'Decentralized oracle network',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    marketCap: 10000000000,
    price: 17,
    chains: ['ethereum'],
    description: 'Leading decentralized exchange protocol',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('[OK] Connected to MongoDB');

    const db = client.db(MONGODB_DB_NAME);

    // Clear old APR data to start fresh with real exchange data
    await db.collection('apr_data').deleteMany({});
    console.log('🗑️  Cleared old APR data');

    // Insert/update assets
    const assetsCollection = db.collection<AssetDocument>('assets');
    for (const asset of assets) {
      await assetsCollection.updateOne(
        { symbol: asset.symbol },
        { $set: asset },
        { upsert: true }
      );
    }
    console.log(`[OK] Seeded ${assets.length} assets`);

    // Create indexes for better performance
    await db.collection('apr_data').createIndex({ asset: 1, platform: 1, chain: 1, lockPeriod: 1 });
    await db.collection('apr_data').createIndex({ apr: -1 });
    await db.collection('apr_data').createIndex({ platform: 1 });
    await db.collection('apr_history').createIndex({ asset: 1, timestamp: -1 });
    console.log('[OK] Created database indexes');

    console.log('');
    console.log('🎉 Database setup completed!');
    console.log('');
    console.log('The backend will now fetch real APR rates from:');
    console.log('  • Binance');
    console.log('  • OKX');
    console.log('  • KuCoin');
    console.log('');
    console.log('Start the backend to begin fetching live data: npm run dev');

  } catch (error) {
    console.error('[ERROR] Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('[OK] MongoDB connection closed');
  }
}

seedDatabase();
