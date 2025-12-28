// setup.js - Helps set up environment on any machine
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 MongoDB Environment Setup');
console.log('Platform:', os.platform());
console.log('');

const envExample = path.join(__dirname, '.env.example');
const envLocal = path.join(__dirname, '.env.local');

if (fs.existsSync(envLocal)) {
  console.log('✅ .env.local already exists');
  
  const content = fs.readFileSync(envLocal, 'utf8');
  const hasHost = content.includes('DB_HOST');
  const hasTLS = content.includes('TLS_CA_FILE');
  
  console.log('Current settings:');
  console.log('- DB_HOST set:', hasHost ? '✅' : '❌');
  console.log('- TLS_CA_FILE set:', hasTLS ? '✅' : '❌');
  
  if (!hasHost || !hasTLS) {
    console.log('\n⚠️  Some settings missing. Check your .env.local file.');
  }
  
} else {
  console.log('❌ .env.local not found');
  console.log('Creating from template...');
  
  fs.copyFileSync(envExample, envLocal);
  console.log('✅ Created .env.local');
  console.log('Please edit it with your local settings.');
  
  if (os.platform() === 'win32') {
    console.log('\n💡 For Windows, set:');
    console.log('TLS_CA_FILE=C:/Users/weviu/Desktop/apr-hunter/ca.crt');
  } else {
    console.log('\n💡 For Linux/Mac, set:');
    console.log('TLS_CA_FILE=/home/san/apr-hunter/ca.crt');
  }
}

console.log('\n🎉 Setup complete! Run:');
console.log('   npm run test:db    # Test MongoDB connection');
console.log('   npm run dev        # Start development server');
