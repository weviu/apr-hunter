// setup-pnpm.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up pnpm environment...\n');

// Check for .env.local
const envLocalPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.log('❌ .env.local not found. Creating from template...');
  
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env.local');
    console.log('✅ Created .env.local from .env.example');
    console.log('📝 Please edit .env.local with your settings');
  } else {
    console.log('⚠️  No .env.example found. Creating basic .env.local...');
    const basicEnv = `DB_HOST=77.42.73.172
DB_PORT=27017
DB_USER=weviu
DB_PASS=passWo
DB_NAME=apr-hunter
TLS_CA_FILE=C:/Users/weviu/Desktop/apr-hunter/ca.crt`;
    fs.writeFileSync('.env.local', basicEnv);
    console.log('✅ Created basic .env.local');
  }
} else {
  console.log('✅ .env.local found');
}

// Test pnpm installation
try {
  console.log('\n🧪 Testing pnpm...');
  const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ pnpm version: ${version}`);
} catch (error) {
  console.log('❌ pnpm not installed or not in PATH');
  console.log('Install with: npm install -g pnpm');
  process.exit(1);
}

// Test environment loading
console.log('\n🧪 Testing environment loading...');
const testScript = `
require('dotenv').config({ path: '.env.local' });
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('TLS_CA_FILE:', process.env.TLS_CA_FILE || 'NOT SET');
`;

fs.writeFileSync('.env-test.js', testScript);
try {
  execSync('node .env-test.js', { stdio: 'inherit' });
  fs.unlinkSync('.env-test.js');
} catch (error) {
  // Clean up
  if (fs.existsSync('.env-test.js')) fs.unlinkSync('.env-test.js');
}

console.log('\n🎉 Setup complete! Run:');
console.log('   pnpm run test:db    # Test MongoDB connection');
console.log('   pnpm run dev        # Start development server');
