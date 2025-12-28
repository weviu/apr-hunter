// setup.js - Guides setup on any machine
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 APR Hunter Setup');
console.log('===================\n');
console.log('Platform:', os.platform());
console.log('Arch:', os.arch());
console.log('');

const platform = os.platform();
const envExample = path.join(__dirname, '.env.example');

// Check for existing env files
const envFiles = fs.readdirSync(__dirname).filter(f => f.startsWith('.env'));
console.log('Found environment files:', envFiles.join(', ') || 'None');

if (platform === 'win32') {
  console.log('\n💻 WINDOWS SETUP:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Edit .env.local with:');
  console.log('   DB_HOST=77.42.73.172');
  console.log('   TLS_CA_FILE=C:/Users/yourname/Desktop/apr-hunter/ca.crt');
  console.log('');
  console.log('Run: pnpm run test:db');
  
} else if (platform === 'linux') {
  console.log('\�🐧 UBUNTU SERVER SETUP:');
  console.log('1. Copy .env.example to .env.server');
  console.log('2. Edit .env.server with:');
  console.log('   DB_HOST=127.0.0.1');
  console.log('   TLS_CA_FILE=/home/san/apr-hunter/ca.crt');
  console.log('');
  console.log('Run: pnpm run test:db:server');
}

console.log('\n📋 Available commands:');
console.log('  pnpm run test:db      - Test Windows → Server connection');
console.log('  pnpm run test:db:server - Test Server → Local MongoDB');
console.log('  pnpm run dev          - Start development server');
console.log('  node setup.js         - Show this help');
