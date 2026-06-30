import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Runs before every test file  loads .env and sets SKIP_ENV_VALIDATION
    setupFiles: ['./tests/helpers/setup.ts'],
    // Unit and integration tests run via `pnpm test`
    // Smoke tests run via `pnpm test:smoke` (requires server running)
    // Exclude all node_modules (including ones vendored into .next during the
    // Next.js build  e.g. bcrypt ships its own *.test.js files), the .next
    // build output, and smoke tests (which require a running server).
    exclude: ['**/node_modules/**', '.next/**', 'tests/smoke/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 70,
      },
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/app/**',           // Next.js pages/routes  covered by smoke tests
        'src/components/**',    // UI  not covered by unit/integration
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
