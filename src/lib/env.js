// src/lib/env.js - Universal environment loader
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

function loadEnv(envFile = '.env.local') {
  const envPath = path.resolve(process.cwd(), envFile);
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          envVars[key.trim()] = value.replace(/^['"]|['"]$/g, '');
        }
      }
    });
    
    // Set to process.env
    Object.assign(process.env, envVars);
    return envVars;
  }
  
  throw new Error(`Environment file not found: ${envFile}`);
}

module.exports = { loadEnv };