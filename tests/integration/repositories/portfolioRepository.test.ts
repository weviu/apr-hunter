import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../helpers/db';
import { portfolioFixture } from '../../helpers/fixtures';
import {
  createPortfolio,
  findPortfoliosByUserId,
  findPortfolioById,
  updatePortfolio,
  softDeletePortfolio,
} from '@/repositories/portfolioRepository';

vi.mock('@/lib/db/mongodb', () => ({
  getMongoDb: () => connectTestDb(),
}));

describe('portfolioRepository', () => {
  const userId = new ObjectId();

  beforeEach(async () => {
    const db = await connectTestDb();
    await clearCollections(db, 'portfolios');
  });

  afterAll(() => disconnectTestDb());

  it('creates a portfolio and returns its id', async () => {
    const id = await createPortfolio(userId, { name: 'My Portfolio' });
    expect(id).toBeTruthy();
    expect(id).toHaveLength(24);
  });

  it('findPortfoliosByUserId excludes soft-deleted portfolios', async () => {
    const activeId = await createPortfolio(userId, { name: 'Active' });
    const deletedId = await createPortfolio(userId, { name: 'Deleted' });

    await softDeletePortfolio(deletedId);

    const results = await findPortfoliosByUserId(userId);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(activeId);
    expect(results[0].name).toBe('Active');
  });

  it('findPortfoliosByUserId returns empty array for new user', async () => {
    const results = await findPortfoliosByUserId(new ObjectId());
    expect(results).toEqual([]);
  });

  it('softDelete sets deletedAt and makes portfolio invisible in list', async () => {
    const id = await createPortfolio(userId, { name: 'Test' });

    const softDeleted = await softDeletePortfolio(id);
    expect(softDeleted).toBe(true);

    // Not in the list
    const list = await findPortfoliosByUserId(userId);
    expect(list.find((p) => p.id === id)).toBeUndefined();

    // findById also treats soft-deleted portfolios as not found
    const found = await findPortfolioById(id);
    expect(found).toBeNull();
  });

  it('softDelete on already-deleted portfolio returns false', async () => {
    const id = await createPortfolio(userId, { name: 'Test' });
    await softDeletePortfolio(id);
    const again = await softDeletePortfolio(id);
    expect(again).toBe(false);
  });

  it('no hard-delete path exists  data is retained after soft-delete', async () => {
    const id = await createPortfolio(userId, { name: 'Retained' });
    await softDeletePortfolio(id);
    const db = await connectTestDb();
    const doc = await db.collection('portfolios').findOne({ _id: new ObjectId(id) });
    expect(doc).not.toBeNull();
    expect(doc?.deletedAt).toBeInstanceOf(Date);
  });

  it('updatePortfolio changes the name', async () => {
    const id = await createPortfolio(userId, { name: 'Old Name' });
    const ok = await updatePortfolio(id, { name: 'New Name' });
    expect(ok).toBe(true);
    const found = await findPortfolioById(id);
    expect(found?.name).toBe('New Name');
  });

  it('updatePortfolio on soft-deleted portfolio returns false', async () => {
    const id = await createPortfolio(userId, { name: 'Test' });
    await softDeletePortfolio(id);
    const ok = await updatePortfolio(id, { name: 'Should not update' });
    expect(ok).toBe(false);
  });
});
