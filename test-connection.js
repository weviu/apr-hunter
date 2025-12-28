// test-connection.js
const { loadEnv } = require('./src/lib/env.js');

try {
  loadEnv('.env.local');
} catch (error) {
  console.error('❌ Failed to load .env.local:', error.message);
  process.exit(1);
}

console.log('🧪 Testing MongoDB Connection...\n');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('TLS_CA_FILE:', process.env.TLS_CA_FILE);

const { MongoClient } = require('mongodb');

async function test() {
  const tlsPath = process.env.TLS_CA_FILE.replace(/\\/g, '/');
  const uri = `mongodb://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
  
  console.log('\n🔧 Connecting...');
  
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    console.log('✅ MongoDB connected!');
    
    const collections = await client.db().listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    await client.close();
    console.log('\n🎉 Success!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();