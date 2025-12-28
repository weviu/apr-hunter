// test-server.js - Server test (works on both Windows and Linux)
const fs = require('fs');
const path = require('path');

console.log('=== SERVER CONNECTION TEST ===');
console.log('Platform:', process.platform);

// Determine correct .env.server path
const envFile = '.env.server';
const envPath = path.resolve(__dirname, envFile);

if (!fs.existsSync(envPath)) {
  console.error(`❌ ${envFile} not found at: ${envPath}`);
  console.log('Note: This test is for server environments');
  console.log('On Windows, use: pnpm run test:db');
  console.log('On Server, create .env.server file');
  process.exit(1);
}

// Load .env.server
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

Object.assign(process.env, envVars);

console.log('\n🧪 Testing SERVER MongoDB Connection...');
console.log('DB_HOST:', process.env.DB_HOST);

// On Windows, warn that this is testing server config
if (process.platform === 'win32') {
  console.log('\n⚠️  WARNING: Testing SERVER config from Windows');
  console.log('This connects to MongoDB on the server (77.42.73.172)');
  console.log('For local tunnel test, use: pnpm run test:db');
}

const { MongoClient } = require('mongodb');

async function test() {
  const tlsPath = process.env.TLS_CA_FILE.replace(/\\/g, '/');
  const uri = `mongodb://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
  
  console.log('\n🔧 Connecting...');
  
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    console.log('✅ SERVER MongoDB connected!');
    
    const db = client.db(process.env.DB_NAME);
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    await client.close();
    console.log('\n🎉 Server connection test successful!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

test();
