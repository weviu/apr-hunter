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
import type { Portfolio, Position, PositionSnapshot } from '@/types/portfolio';
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
