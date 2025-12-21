import { MongoClient, Db } from 'mongodb';
import { runtimeEnv } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) {
    return db;
  }

  client = new MongoClient(runtimeEnv.MONGODB_URI);
  await client.connect();
  db = client.db(runtimeEnv.MONGODB_DB_NAME);
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

