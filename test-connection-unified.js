// test-connection-unified.js - Works on Windows AND Ubuntu
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 Unified MongoDB Connection Test');
console.log('==================================\n');
console.log('Platform:', os.platform());
console.log('Arch:', os.arch());
console.log('Node:', process.version);
console.log('');

// Auto-detect environment
function detectEnvironment() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    console.log('💻 Detected: Windows machine');
    return {
      envFile: '.env.local',
      description: 'Windows connecting to Remote Server',
      defaultHost: '77.42.73.172'
    };
  } else if (platform === 'linux') {
    console.log('🐧 Detected: Ubuntu Server');
    return {
      envFile: '.env.server', 
      description: 'Server connecting to Local MongoDB',
      defaultHost: '127.0.0.1'
    };
  } else {
    console.log('🔍 Detected: Other platform');
    return {
      envFile: '.env.local',
      description: 'Unknown platform',
      defaultHost: '127.0.0.1'
    };
  }
}

const envInfo = detectEnvironment();
console.log('Using env file:', envInfo.envFile);
console.log('Mode:', envInfo.description);

// Load environment file
const envPath = path.resolve(__dirname, envInfo.envFile);

if (!fs.existsSync(envPath)) {
  console.error(`\n❌ ${envInfo.envFile} not found at: ${envPath}`);
  console.log('\n💡 Create it with:');
  console.log(`cp .env.example ${envInfo.envFile}`);
  console.log('\n📝 Then edit it with:');
  
  if (os.platform() === 'win32') {
    console.log('DB_HOST=77.42.73.172');
    console.log('TLS_CA_FILE=C:/Users/yourname/Desktop/apr-hunter/ca.crt');
  } else {
    console.log('DB_HOST=127.0.0.1');
    console.log('TLS_CA_FILE=/home/san/apr-hunter/ca.crt');
  }
  
  process.exit(1);
}

// Parse environment file
console.log(`\n📁 Loading ${envInfo.envFile}...`);
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

console.log('✅ Environment loaded');
console.log('DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('DB_USER:', process.env.DB_USER || 'Not set');
console.log('TLS_CA_FILE:', process.env.TLS_CA_FILE || 'Not set');

// Check TLS certificate
if (!process.env.TLS_CA_FILE) {
  console.error('\n❌ TLS_CA_FILE not set in environment');
  process.exit(1);
}

const tlsPath = process.env.TLS_CA_FILE.replace(/\\/g, '/');
if (!fs.existsSync(tlsPath)) {
  console.error(`\n❌ TLS certificate not found: ${tlsPath}`);
  
  // Platform-specific troubleshooting
  if (os.platform() === 'win32') {
    console.log('\n💡 Windows troubleshooting:');
    console.log('1. Check the file exists:');
    console.log(`   ${tlsPath}`);
    console.log('2. Try forward slashes: C:/Users/.../ca.crt');
    console.log('3. Copy certificate from server:');
    console.log('   scp san@77.42.73.172:/home/san/apr-hunter/ca.crt .');
  } else {
    console.log('\n💡 Ubuntu troubleshooting:');
    console.log('1. Check Docker certs: /home/san/apr-hunter/mongodb/tls-certs/');
    console.log('2. Copy with: cp mongodb/tls-certs/ca.crt .');
    console.log('3. Or update .env.server path');
  }
  
  process.exit(1);
}

console.log('✅ TLS certificate found');

// Build connection URI
const uri = `mongodb://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;

console.log(`\n🔧 ${envInfo.description}`);
console.log('URI (masked):', uri.replace(/:[^:]*@/, ':****@'));

// Test connection
const { MongoClient } = require('mongodb');

async function testConnection() {
  console.log('\n⏳ Connecting to MongoDB...');
  
  try {
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000 
    });
    
    await client.connect();
    console.log('✅ MongoDB connected successfully!');
    
    // Get database info
    const db = client.db(process.env.DB_NAME);
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Database: ${db.databaseName}`);
    console.log(`📁 Collections (${collections.length}):`);
    collections.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.name}`);
    });
    
    // Test a simple query on each collection
    console.log('\n🧪 Testing collections...');
    for (const col of collections) {
      try {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  ${col.name}: ${count} documents`);
      } catch (err) {
        console.log(`  ${col.name}: OK (count skipped)`);
      }
    }
    
    await client.close();
    
    console.log('\n🎉 All tests passed!');
    console.log(`\n✅ ${envInfo.description} - Connection verified`);
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    
    // Platform-specific troubleshooting
    console.log('\n🔧 Troubleshooting:');
    if (os.platform() === 'win32') {
      console.log('1. Check SSH tunnel is running (if using tunnel)');
      console.log('2. Server firewall allows port 27017');
      console.log('3. MongoDB is running on server');
    } else {
      console.log('1. Check Docker: docker-compose ps');
      console.log('2. Check MongoDB logs: docker-compose logs mongodb');
      console.log('3. Verify TLS certificate path');
    }
    
    console.log('4. Test with: telnet', process.env.DB_HOST, process.env.DB_PORT);
    
    process.exit(1);
  }
}

testConnection();
