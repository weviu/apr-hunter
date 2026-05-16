/**
 * Test DB helpers — wraps the same Docker MongoDB instance but uses a
 * dedicated 'apr-hunter-test' database so test runs never touch dev data.
 *
 * Usage in integration tests:
 *
 *   vi.mock('@/lib/db/mongodb', () => ({ getMongoDb: () => connectTestDb() }));
 *
 *   beforeEach(async () => {
 *     const db = await connectTestDb();
 *     await clearCollections(db, 'users', 'sessions');
 *   });
 *
 *   afterAll(() => disconnectTestDb());
 */
import { MongoClient, Db } from 'mongodb';

const TEST_DB_NAME = 'apr-hunter-test';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectTestDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('[test] MONGODB_URI is not set — cannot connect to test database');

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(TEST_DB_NAME);
  return db;
}

export async function disconnectTestDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

/** Drop all documents from the named collections between tests. */
export async function clearCollections(testDb: Db, ...collections: string[]): Promise<void> {
  await Promise.all(collections.map((c) => testDb.collection(c).deleteMany({})));
}
