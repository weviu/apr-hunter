// src/lib/mongodb.js
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

function getMongoUri() {
  // Determine which env file to use
  const isServer = process.platform === 'linux';
  const envFile = isServer ? '.env.server' : '.env.local';
  
  // Try to load from file first
  try {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
          }
        }
      });
      
      const { DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME, TLS_CA_FILE } = envVars;
      if (DB_USER && DB_PASS && DB_HOST && TLS_CA_FILE) {
        const tlsPath = TLS_CA_FILE.replace(/\\/g, '/');
        return `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
      }
    }
  } catch (error) {
    console.warn(`Could not load ${envFile}:`, error.message);
  }
  
  // Fallback to process.env (Next.js loads .env.local by default)
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // Last resort: Use individual env vars
  const { DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME, TLS_CA_FILE } = process.env;
  if (DB_USER && DB_PASS && DB_HOST && TLS_CA_FILE) {
    const tlsPath = TLS_CA_FILE.replace(/\\/g, '/');
    return `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
  }
  
  throw new Error('MongoDB URI not configured');
}

const uri = getMongoUri();
console.log(`[MongoDB] Using ${process.platform === 'linux' ? 'SERVER' : 'LOCAL'} configuration`);

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
