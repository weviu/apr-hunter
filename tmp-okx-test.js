const https = require('https');
const crypto = require('crypto');
const timestamp = new Date().toISOString();
const method = 'GET';
const requestPath = '/api/v5/finance/savings/product-list?state=1';
const body = '';
const prehash = timestamp + method + requestPath + body;
const secret = 'F6233DDB69DA0AAC679C35E14328763C';
const signature = crypto.createHmac('sha256', secret).update(prehash).digest('base64');
const headers = {
  'OK-ACCESS-KEY': '30243a9f-71c1-4f3f-bf66-128877fc95f9',
  'OK-ACCESS-SIGN': signature,
  'OK-ACCESS-TIMESTAMP': timestamp,
  'OK-ACCESS-PASSPHRASE': 'bq3vk4!ICRpP',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
const options = {
  hostname: 'www.okx.com',
  path: requestPath,
  method,
  headers,
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(data);
  });
}).on('error', (err) => console.error('err', err));
