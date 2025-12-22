#!/usr/bin/env node

const concurrently = require('concurrently');

const args = process.argv.slice(2);
let forwardedArgs = [];

const doubleDashIndex = args.indexOf('--');
if (doubleDashIndex !== -1) {
  forwardedArgs = args.slice(doubleDashIndex + 1);
  args.splice(doubleDashIndex);
}

let port = process.env.PORT || '3000';

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === '-p' || arg === '--port') {
    const value = args[i + 1];

    if (!value) {
      console.error('Error: missing value for the port flag.');
      process.exit(1);
    }

    if (!/^[0-9]+$/.test(value)) {
      console.error('Error: port must be a number.');
      process.exit(1);
    }

    port = value;
    i += 1;
  } else {
    console.warn(`Warning: unknown option "${arg}" ignored.`);
  }
}

const env = { ...process.env, PORT: port };
const frontendCommand =
  forwardedArgs.length > 0
    ? `pnpm --filter apr-finder-frontend dev -- ${forwardedArgs.join(' ')}`
    : 'pnpm --filter apr-finder-frontend dev';

const workerCommand = 'pnpm -C frontend run worker';

console.log(`Starting frontend on port ${port}...`);

concurrently(
  [
    {
      command: frontendCommand,
      name: 'frontend',
      prefixColor: 'green',
      env,
    },
    {
      command: workerCommand,
      name: 'worker',
      prefixColor: 'magenta',
      env,
    },
  ],
  {
    killOthers: ['failure', 'success'],
  },
)
  .result.then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
