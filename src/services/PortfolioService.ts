import {
  createPortfolio,
  findPortfoliosByUserId,
  findPortfolioById,
  updatePortfolio,
  softDeletePortfolio,
} from '@/repositories/portfolioRepository';
import {
  createPosition,
  findOpenPositionsByPortfolioId,
  findAllPositionsByUserId,
  findPositionById,
  updatePosition,
  closePosition,
  getPositionStats,
  savePositionSnapshot,
  getPositionSnapshots,
} from '@/repositories/positionRepository';
import type { Portfolio, Position, PositionSnapshot, EnrichedPosition } from '@/types/portfolio';
import { getLatestAprFor } from '@/repositories/aprRepository';
import { ObjectId } from 'mongodb';

// ─── Portfolio operations ──────────────────────────────────────────────────────

export async function createUserPortfolio(
  userId: string,
  data: { name: string; description?: string },
): Promise<Portfolio> {
  const id = await createPortfolio(userId, data);
  const portfolio = await findPortfolioById(id);
  if (!portfolio) throw new Error('Portfolio creation failed');
  return portfolio;
}

export async function getUserPortfolios(userId: string): Promise<Portfolio[]> {
  return findPortfoliosByUserId(userId);
}

export async function getPortfolio(
  portfolioId: string,
  userId: string,
): Promise<Portfolio | null> {
  const portfolio = await findPortfolioById(portfolioId);
  if (!portfolio) return null;
  // Enforce ownership
  if (portfolio.userId !== userId) return null;
  return portfolio;
}

export async function updateUserPortfolio(
  portfolioId: string,
  userId: string,
  data: Partial<{ name: string; description: string | null }>,
): Promise<boolean> {
  const portfolio = await findPortfolioById(portfolioId);
  if (!portfolio || portfolio.userId !== userId) return false;
  return updatePortfolio(portfolioId, data);
}

export async function deleteUserPortfolio(portfolioId: string, userId: string): Promise<boolean> {
  const portfolio = await findPortfolioById(portfolioId);
  if (!portfolio || portfolio.userId !== userId) return false;
  return softDeletePortfolio(portfolioId);
}

// ─── Position operations ───────────────────────────────────────────────────────

export interface CreatePositionInput {
  portfolioId: string;
  asset: string;
  exchange: string;
  product?: string | null;
  protocol?: string | null;
  chainId?: number | null;
  walletAddress?: string | null;
  amount: number;
  aprAtEntry: number;
  stakedAt?: Date;
  notes?: string | null;
}

export async function addPosition(
  userId: string,
  input: CreatePositionInput,
): Promise<Position> {
  // Verify portfolio ownership
  const portfolio = await findPortfolioById(input.portfolioId);
  if (!portfolio || portfolio.userId !== userId) {
    throw new Error('Portfolio not found');
  }

  const id = await createPosition({
    portfolioId: new ObjectId(input.portfolioId),
    userId: new ObjectId(userId),
    asset: input.asset.toUpperCase(),
    exchange: input.exchange,
    product: input.product ?? null,
    protocol: input.protocol ?? null,
    chainId: input.chainId ?? null,
    walletAddress: input.walletAddress ?? null,
    amount: input.amount,
    aprAtEntry: input.aprAtEntry,
    stakedAt: input.stakedAt ?? new Date(),
    closedAt: null,
    notes: input.notes ?? null,
  });

  const position = await findPositionById(id);
  if (!position) throw new Error('Position creation failed');
  return position;
}

export async function getPortfolioPositions(
  portfolioId: string,
  userId: string,
): Promise<Position[]> {
  const portfolio = await findPortfolioById(portfolioId);
  if (!portfolio || portfolio.userId !== userId) return [];
  return findOpenPositionsByPortfolioId(portfolioId);
}

export async function getUserPositions(userId: string): Promise<Position[]> {
  return findAllPositionsByUserId(userId);
}

const DEFAULT_PORTFOLIO_NAME = 'My Positions';

/**
 * Resolve the user's single default portfolio (the hidden container for the
 * "My Positions" UI), creating it on first use. Uses the oldest active
 * portfolio for stability if several exist (legacy multi-portfolio users).
 */
export async function getOrCreateDefaultPortfolio(userId: string): Promise<string> {
  const existing = await findPortfoliosByUserId(userId); // active, sorted createdAt desc
  if (existing.length > 0) return existing[existing.length - 1].id;
  return createPortfolio(userId, { name: DEFAULT_PORTFOLIO_NAME });
}

/**
 * Create a manual position in the user's default portfolio, capturing the
 * current live APR for the chosen (asset, exchange, product) as aprAtEntry.
 */
export async function createManualPosition(
  userId: string,
  input: { asset: string; exchange: string; product?: string | null; amount: number },
): Promise<Position> {
  const portfolioId = await getOrCreateDefaultPortfolio(userId);
  const live = await getLatestAprFor(input.asset, input.exchange, input.product ?? null);
  return addPosition(userId, {
    portfolioId,
    asset: input.asset,
    exchange: input.exchange,
    product: input.product ?? null,
    amount: input.amount,
    aprAtEntry: live?.apr ?? 0,
  });
}

/**
 * All open positions for a user, each joined to its current live APR from
 * apr_snapshots (fast DB read; the snapshot table is kept warm by the sync job).
 */
export async function getEnrichedUserPositions(userId: string): Promise<EnrichedPosition[]> {
  const positions = (await findAllPositionsByUserId(userId)).filter((p) => p.closedAt === null);
  return Promise.all(
    positions.map(async (p) => {
      const live = await getLatestAprFor(p.asset, p.exchange, p.product);
      return {
        ...p,
        currentApr: live?.apr ?? null,
        aprSyncedAt: live?.syncedAt ?? null,
      };
    }),
  );
}

export async function updateUserPosition(
  positionId: string,
  userId: string,
  data: Partial<{ amount: number; notes: string | null }>,
): Promise<boolean> {
  const position = await findPositionById(positionId);
  if (!position || position.userId !== userId) return false;
  return updatePosition(positionId, data);
}

export async function closeUserPosition(positionId: string, userId: string): Promise<boolean> {
  const position = await findPositionById(positionId);
  if (!position || position.userId !== userId) return false;
  return closePosition(positionId);
}

export { getPositionStats, savePositionSnapshot, getPositionSnapshots };
