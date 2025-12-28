// test-local.js - Windows/Local test
const fs = require('fs');
const path = require('path');

// Always load .env.local for this script
const envPath = path.resolve(__dirname, '.env.local');
console.log(`📁 Loading environment from: ${envPath}`);

if (!fs.existsSync(envPath)) {
  console.error(`❌ .env.local not found at: ${envPath}`);
  console.log('Create .env.local with Windows paths (C:/Users/...)');
  process.exit(1);
}

// Parse .env.local manually
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

// Set to process.env
Object.assign(process.env, envVars);

console.log('🧪 Testing LOCAL (Windows) MongoDB Connection...\n');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('TLS_CA_FILE:', process.env.TLS_CA_FILE);

// Verify certificate exists (handle Windows paths)
const tlsPath = process.env.TLS_CA_FILE.replace(/\\/g, '/');
if (!fs.existsSync(tlsPath)) {
  console.error(`❌ TLS certificate not found: ${tlsPath}`);
  console.log('Current directory:', __dirname);
  
  // Try alternative Windows paths
  const possiblePaths = [
    tlsPath,
    tlsPath.replace('C:', 'C:'), // Ensure proper drive letter
    path.join(__dirname, 'ca.crt'),
    'C:/Users/weviu/Desktop/apr-hunter/ca.crt'
  ];
  
  console.log('\n🔍 Checking common locations:');
  for (const p of possiblePaths) {
    console.log(`  ${fs.existsSync(p) ? '✅' : '❌'} ${p}`);
  }
  
  process.exit(1);
}

const { MongoClient } = require('mongodb');

async function test() {
  const uri = `mongodb://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
  
  console.log('\n🔧 Connecting to REMOTE MongoDB from Windows...');
  console.log('URI (masked):', uri.replace(/:[^:]*@/, ':****@'));
  
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    console.log('✅ MongoDB connected from Windows!');
    
    const db = client.db(process.env.DB_NAME);
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.map(c => c.name).join(', ')}`);
    
    await client.close();
    console.log('\n🎉 Windows connection test successful!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check SSH tunnel is running (if using tunnel)');
    console.log('2. Check certificate path is correct');
    console.log('3. Server firewall allows port 27017');
    process.exit(1);
  }
}

test();
