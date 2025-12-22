import { Db, MongoClient } from 'mongodb';
import { env } from '@/lib/env';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function isValidMongoUri(uri?: string | null) {
  if (!uri) return false;
  const trimmed = uri.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.endsWith('://')) return false;
  return true;
}

export async function getMongoDb(): Promise<Db | null> {
  if (!isValidMongoUri(env.MONGODB_URI)) {
    return null;
  }

  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  try {
    const uri = env.MONGODB_URI!.trim();
    const client = new MongoClient(uri, {
      retryWrites: true,
    });

    await client.connect();
    cachedClient = client;
    cachedDb = client.db(env.MONGODB_DB_NAME || 'apr-hunter');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection failed, falling back to in-memory data', error);
    return null;
  }
}

export async function closeMongoConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
