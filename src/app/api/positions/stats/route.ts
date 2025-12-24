import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';
import { getUserFromRequest, unauthorized, dbUnavailable } from '@/lib/api/server-auth';
import { getPrices } from '@/lib/prices/coin-gecko';
import { fetchAprBySymbol } from '@/lib/exchanges/registry';

async function enrichPositionWithApr(db: any, position: any) {
  // Try live APR first
  try {
    const liveBySymbol = await fetchAprBySymbol(position.asset);
    const liveMatch = liveBySymbol.find(
      (item) => item.platform?.toLowerCase() === position.platform?.toLowerCase()
    );
    if (liveMatch?.apr !== undefined) {
      position.currentApr = liveMatch.apr;
      position.aprSource = liveMatch.platform || position.platform;
      position.aprLastUpdated = liveMatch.lastUpdated || new Date().toISOString();
      return position;
    }
  } catch (e) {
    // If live fetch fails, fall back to DB
  }

  const aprData = await db.collection('apr_data').findOne({
    platform: { $regex: new RegExp(`^${position.platform}$`, 'i') },
    asset: { $regex: new RegExp(`^${position.asset}$`, 'i') },
  });

  if (aprData) {
    position.currentApr = aprData.apr;
    position.aprSource = aprData.source || aprData.platform || position.platform;
    position.aprLastUpdated = aprData.lastUpdated || new Date().toISOString();
  }
  return position;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET(req: Request) {
  const auth = await getUserFromRequest(req);
  if (!auth) return unauthorized();
  const db = await getMongoDb();
  if (!db) return dbUnavailable();

  const userId = auth.user._id;
  const positionsRaw = await db
    .collection('positions')
    .find({ userId: new ObjectId(userId), status: 'active' })
    .sort({ createdAt: -1 })
    .toArray();

  const normalized = positionsRaw.map((p: any) => {
    const amount = Number(p.amount) || 0;
    const entryPrice = p.entryPrice !== undefined ? Number(p.entryPrice) : undefined;
    const currentApr = typeof p.currentApr === 'number' ? p.currentApr : Number(p.entryApr) || 0;
    const aprSource = p.aprSource || p.platform || 'N/A';
    const aprLastUpdated = p.aprLastUpdated || p.updatedAt || p.createdAt;
    const asset = String(p.asset).toUpperCase();

    return {
      ...p,
      _id: p._id?.toString?.() ?? String(p._id),
      amount,
      asset,
      entryApr: Number(p.entryApr),
      currentApr,
      aprSource,
      aprLastUpdated,
      entryPrice,
    };
  });

  // Always fetch live prices for displayed positions (do not trust stored currentValue)
  const allAssets = Array.from(new Set(normalized.map((p) => p.asset).filter(Boolean)));
  const priceMap = allAssets.length ? await getPrices(allAssets) : {};

  normalized.forEach((p) => {
    const livePrice = priceMap[p.asset];
    if (typeof livePrice === 'number' && livePrice > 0 && p.amount > 0) {
      p.currentPrice = livePrice;
      p.currentValue = livePrice * p.amount;
    } else if (typeof p.entryPrice === 'number' && p.entryPrice > 0 && p.amount > 0) {
      // fallback to entry price if no live price available
      p.currentValue = p.entryPrice * p.amount;
    } else {
      p.currentValue = undefined;
    }
  });

  for (const pos of normalized) {
    await enrichPositionWithApr(db, pos);
  }

  let totalValue = 0;
  let totalEarnings = 0;

  for (const position of normalized) {
    const positionValue =
      typeof position.currentValue === 'number'
        ? position.currentValue
        : Number(position.entryPrice) * position.amount || 0;
    if (typeof positionValue === 'number') {
      totalValue += positionValue;
    }

    const apr = typeof position.currentApr === 'number' ? position.currentApr : 0;
    const dailyRate = apr / 100 / 365;
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    totalEarnings += positionValue * dailyRate * daysSinceCreation;
  }

  return NextResponse.json({
    success: true,
    totalValue: round2(totalValue),
    totalEarnings: round2(totalEarnings),
    positionCount: normalized.length,
    positions: normalized.map((p) => ({
      ...p,
      currentValue: typeof p.currentValue === 'number' ? round2(p.currentValue) : p.currentValue,
    })),
  });
}

