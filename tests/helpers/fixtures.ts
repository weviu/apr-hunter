/**
 * Minimal document factories for integration tests.
 * Each factory returns a plain object suitable for direct collection.insertOne().
 */
import { ObjectId } from 'mongodb';

export function userFixture(overrides: Partial<{
  email: string;
  passwordHash: string;
  name: string;
}> = {}) {
  return {
    email: overrides.email ?? `test-${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash ?? '$2b$12$testhash',
    name: overrides.name ?? 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function sessionFixture(userId: ObjectId, overrides: Partial<{
  tokenHash: string;
  expiresAt: Date;
}> = {}) {
  return {
    userId,
    tokenHash: overrides.tokenHash ?? `hash-${Date.now()}`,
    createdAt: new Date(),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

export function aprSnapshotFixture(overrides: Partial<{
  exchange: string;
  asset: string;
  apr: number;
  syncedAt: Date;
  source: 'live' | 'sample';
}> = {}) {
  return {
    exchange: overrides.exchange ?? 'binance',
    asset: overrides.asset ?? 'USDT',
    product: null,
    apr: overrides.apr ?? 0.05,
    apy: null,
    minAmount: null,
    currency: 'USD',
    source: overrides.source ?? 'sample',
    syncedAt: overrides.syncedAt ?? new Date(),
  };
}

export function portfolioFixture(userId: ObjectId, overrides: Partial<{
  name: string;
}> = {}) {
  return {
    userId,
    name: overrides.name ?? 'Test Portfolio',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

export function positionFixture(portfolioId: ObjectId, userId: ObjectId, overrides: Partial<{
  asset: string;
  exchange: string;
  amount: number;
}> = {}) {
  return {
    portfolioId,
    userId,
    asset: overrides.asset ?? 'USDT',
    exchange: overrides.exchange ?? 'binance',
    protocol: null,
    chainId: null,
    walletAddress: null,
    amount: overrides.amount ?? 1000,
    aprAtEntry: 0.05,
    stakedAt: new Date(),
    closedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function alertFixture(userId: ObjectId, overrides: Partial<{
  asset: string;
  condition: 'above' | 'below';
  threshold: number;
}> = {}) {
  return {
    userId,
    asset: overrides.asset ?? 'USDT',
    exchange: null,
    condition: overrides.condition ?? 'above',
    threshold: overrides.threshold ?? 0.06,
    active: true,
    lastFiredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
