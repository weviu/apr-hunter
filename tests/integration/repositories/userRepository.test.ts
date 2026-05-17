import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../helpers/db';
import { userFixture } from '../../helpers/fixtures';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
} from '@/repositories/userRepository';
import { ensureIndexes } from '@/lib/db/indexes';

vi.mock('@/lib/db/mongodb', () => ({
  getMongoDb: () => connectTestDb(),
}));

describe('userRepository', () => {
  beforeAll(async () => {
    // Create indexes (e.g. unique email) on the test database
    const db = await connectTestDb();
    await ensureIndexes(db);
  });

  beforeEach(async () => {
    const db = await connectTestDb();
    await clearCollections(db, 'users');
  });

  afterAll(() => disconnectTestDb());

  it('creates a user and returns its id', async () => {
    const fixture = userFixture();
    const id = await createUser({
      email: fixture.email,
      passwordHash: fixture.passwordHash,
      name: fixture.name,
    });
    expect(id).toBeTruthy();
    expect(id).toHaveLength(24); // ObjectId hex
  });

  it('finds a user by email (case-insensitive normalisation)', async () => {
    const fixture = userFixture({ email: 'Alice@Example.COM' });
    await createUser({ email: fixture.email, passwordHash: fixture.passwordHash, name: fixture.name });

    const found = await findUserByEmail('alice@example.com');
    expect(found).not.toBeNull();
    expect(found?.email).toBe('alice@example.com');
    // passwordHash should be stored but session fields absent
    expect(found?.passwordHash).toBeTruthy();
    expect((found as unknown as Record<string, unknown>)['sessionToken']).toBeUndefined();
  });

  it('returns null for unknown email', async () => {
    const result = await findUserByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('throws on duplicate email', async () => {
    const fixture = userFixture({ email: 'dup@example.com' });
    const data = { email: fixture.email, passwordHash: fixture.passwordHash, name: fixture.name };
    await createUser(data);
    await expect(createUser(data)).rejects.toThrow();
  });

  it('finds a user by id', async () => {
    const fixture = userFixture();
    const id = await createUser({
      email: fixture.email,
      passwordHash: fixture.passwordHash,
      name: fixture.name,
    });
    const found = await findUserById(id);
    expect(found).not.toBeNull();
    expect(found?._id.toHexString()).toBe(id);
  });

  it('updates the password hash', async () => {
    const fixture = userFixture();
    const id = await createUser({
      email: fixture.email,
      passwordHash: fixture.passwordHash,
      name: fixture.name,
    });

    const updated = await updateUserPassword(id, '$2b$12$newhash');
    expect(updated).toBe(true);

    const found = await findUserById(id);
    expect(found?.passwordHash).toBe('$2b$12$newhash');
  });
});
