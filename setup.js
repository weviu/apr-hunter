// setup.js - Guides user based on platform
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('🚀 APR Hunter Setup');
console.log('===================\n');

const platform = os.platform();
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

console.log(`Platform: ${platform} ${isWindows ? '💻' : isLinux ? '🐧' : '🔍'}`);
console.log('');

if (isWindows) {
  console.log('WINDOWS SETUP INSTRUCTIONS:');
  console.log('1. Copy certificate from server:');
  console.log('');
  console.log('2. Create .env.local:');
  console.log('   cp .env.example .env.local');
  console.log('');
  console.log('3. Edit .env.local with:');
  console.log('   DB_HOST=77.42.73.172');
  console.log('   TLS_CA_FILE=C:/Users/weviu/Desktop/apr-hunter/ca.crt');
  
} else if (isLinux) {
  console.log('UBUNTU SERVER SETUP INSTRUCTIONS:');
  console.log('1. Create .env.server:');
  console.log('   cp .env.example .env.server');
  console.log('');
  console.log('2. Edit .env.server with:');
  console.log('   DB_HOST=127.0.0.1');
  console.log('   TLS_CA_FILE=/home/san/apr-hunter/ca.crt');
  console.log('');
  console.log('3. Ensure certificate exists:');
  console.log('   cp mongodb/tls-certs/ca.crt .');
  
} else {
  console.log('UNKNOWN PLATFORM - Manual setup required');
}

console.log('\n📋 QUICK COMMANDS:');
console.log('  pnpm test          - Test MongoDB connection');
console.log('  pnpm dev           - Start dev server (Windows)');
console.log('  pnpm start:server  - Start production (Ubuntu)');
console.log('  node setup.js      - Show this help');

// Auto-create env file if missing
const envFile = isWindows ? '.env.local' : '.env.server';
if (!fs.existsSync(envFile) && fs.existsSync('.env.example')) {
  console.log(`\n⚡ Auto-creating ${envFile} from template...`);
  fs.copyFileSync('.env.example', envFile);
  console.log(`✅ Created ${envFile}`);
  console.log(`📝 Edit it with your settings`);
}
