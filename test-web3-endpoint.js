#!/usr/bin/env node

/**
 * Test the Web3 position detection endpoint
 */

const http = require('http');

async function testEndpoint() {
  console.log('Testing /api/web3/detect-positions endpoint...\n');

  const data = JSON.stringify({
    walletAddress: '0x1234567890123456789012345678901234567890',
    chainIds: [1], // Ethereum mainnet only for quick test
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/web3/detect-positions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': 'Bearer test-token', // Add a test token
    },
    timeout: 5000, // 5 second timeout
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('\nResponse body:');
        try {
          console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch {
          console.log(body);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      reject(e);
    });

    req.on('timeout', () => {
      console.error('Request timeout after 5 seconds');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();

    console.log('Request sent, waiting for response...');
  });
}

testEndpoint()
  .then(() => {
    console.log('\n✓ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  });
