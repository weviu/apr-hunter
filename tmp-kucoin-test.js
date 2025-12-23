const https = require('https');
const crypto = require('crypto');
const timestamp = Date.now().toString();
const method = 'GET';
const requestPath = '/api/v1/earn/products';
const body = '';
const secret = 'ad438db8-fb16-4854-bfa9-4f2f153f2a2a';
const prehash = timestamp + method + requestPath + body;
const signature = crypto.createHmac('sha256', secret).update(prehash).digest('base64');
const headers = {
  'KC-API-KEY': '69494a128ba16b0001db90ed',
  'KC-API-SIGN': signature,
  'KC-API-TIMESTAMP': timestamp,
  'KC-API-PASSPHRASE': 'YnEzdms0IUlDUnBQ',
  'KC-API-KEY-VERSION': '2',
  'Content-Type': 'application/json',
};
const options = {
  hostname: 'api.kucoin.com',
  path: requestPath,
  method,
  headers,
};
https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log(data);
  });
}).on('error', (err) => console.error('err', err));
