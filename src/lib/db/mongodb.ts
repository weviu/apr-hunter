import { existsSync } from 'node:fs';

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

function maskMongoUri(rawUri: string) {
  try {
    const parsed = new URL(rawUri);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return rawUri;
  }
}

function describeMongoUri(rawUri: string) {
  const maskedUri = maskMongoUri(rawUri);
  try {
    const parsed = new URL(rawUri);
    const dbName = parsed.pathname?.replace(/^\//, '') || undefined;
    const tlsCAFile = parsed.searchParams.get('tlsCAFile') || undefined;
    const tlsCAFileExists = tlsCAFile ? existsSync(tlsCAFile) : undefined;

    return {
      maskedUri,
      host: parsed.hostname || undefined,
      port: parsed.port || undefined,
      dbName,
      tlsCAFile,
      tlsCAFileExists,
    };
  } catch {
    return { maskedUri };
  }
}

export async function getMongoDb(): Promise<Db | null> {
  if (!isValidMongoUri(env.MONGODB_URI)) {
    console.warn('[MongoDB] Missing or invalid MONGODB_URI. Skipping connection attempt.');
    return null;
  }

  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  try {
    const uri = env.MONGODB_URI!.trim();
    const uriDetails = describeMongoUri(uri);
    console.info('[MongoDB] Attempting connection with config:', uriDetails);

    const client = new MongoClient(uri, {
      retryWrites: true,
    });

    await client.connect();
    cachedClient = client;
    cachedDb = client.db(env.MONGODB_DB_NAME || 'apr-hunter');
    return cachedDb;
  } catch (error) {
    const uri = env.MONGODB_URI?.trim();
    const uriDetails = uri ? describeMongoUri(uri) : {};
    console.error('[MongoDB] Connection failed, falling back to in-memory data', {
      ...uriDetails,
      error: error instanceof Error ? error.message : error,
      errorName: error instanceof Error ? error.name : undefined,
    });
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
