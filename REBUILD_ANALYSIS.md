# APR Hunter — Rebuild Analysis

## What This Project Is

APR Hunter is a yield-intelligence platform for passive crypto investors. Its core job is simple: scrape staking/earn rates from centralized exchanges (Binance, OKX, KuCoin) and DeFi protocols (Aave, Yearn, Kraken), aggregate them, and present them in a single ranked view so the user can immediately see where their money earns the most with minimal effort.

Secondary features built on top of that core:
- **Portfolio tracking** — users register, log in, and record what they have staked and where.
- **APR alerts** — notify the user when a rate crosses a threshold they set.
- **Web3 position detection** — connect a wallet, scan multiple chains, and import on-chain positions into the portfolio.

The intended business model is referral/affiliate links at first, then a $10/month premium tier for alerts and analytics.

---

## What Works Well (Carry Forward)

- The product idea is clear and focused: one leaderboard, one comparison view, one portfolio.
- The dark glassmorphism UI is polished and distinctive.
- Using Next.js App Router with a single-folder structure was the right call.
- MongoDB as the persistence layer fits the schema-flexible nature of APR data.
- The fallback to sample data when live keys are absent is a good pattern — the UI never breaks.
- React Query for client-side data is appropriate given the polling requirements.

---

## Flaws to Avoid in the Rebuild

### 1. Architecture

| Flaw | Impact |
|------|--------|
| Two parallel adapter systems (`cex-adapter.ts` and `cex-adapter-oauth.ts`) with duplicate class names for the same exchanges | Build errors, confusion about which is authoritative |
| `registry.ts` accumulating APR fetching logic (Binance, OKX, KuCoin live callers) instead of delegating to the adapter classes | A single 600-line file that does too many things |
| App Router and Pages Router routes coexisting (`/api/prices` existed in both) | Hard Next.js build failure |
| `init-server.ts` importing an interval sync service that itself imports a route handler (`refresh-apr/route.ts`) | Circular-style coupling; the background job and the HTTP handler are the same code |
| Background APR sync running inside the Next.js process via `setInterval` in `layout.tsx` | Sync fires on every worker restart, creates 3 parallel syncs during build, produces 502s in production when the process restarts |
| No clear boundary between "data that must be fast" (DB read) and "data that may be slow" (live exchange fetch) | Live fetch latency surfaces directly in page load |

### 2. Data Layer

| Flaw | Impact |
|------|--------|
| APR snapshot writes are fire-and-forget inside the same request that serves the response | If Mongo is slow, the HTTP response is slow |
| No TTL or staleness contract on snapshots | The UI shows "stale" badges but has no enforcement that causes a refresh |
| `portfolioRepository.ts` mixes soft-delete logic added mid-development with hard-delete patterns from earlier; only one was consistent | Data integrity confusion |
| Auth tokens stored as a plain field on the user document (`sessionToken`, `sessionExpiresAt`) | No sessions collection, no ability to list or revoke multiple sessions, no index-based expiry |
| Token stored in `localStorage` | Vulnerable to XSS; a `httpOnly` cookie is the correct choice |

### 3. API Surface

| Flaw | Impact |
|------|--------|
| No versioning or consistent envelope — some routes return `{ success, data }`, others return a bare array, others return `{ data: { portfolios: [] } }` | Every consumer has defensive fallback chains like `Array.isArray(res) ? res : res.data?.portfolios ?? []` |
| Rate-limiting only on auth routes, nowhere else | APR and portfolio endpoints are unprotected |
| `NEXT_PUBLIC_API_BASE` env var used on the client but not consistently set in production | All dashboard API calls break when the var is missing |
| `/api/alerts/evaluate` is a public HTTP endpoint protected only by a shared secret passed as a header | The secret leaks in logs; a proper cron-only route with no HTTP surface is safer |

### 4. Component Design

| Flaw | Impact |
|------|--------|
| `Web3PositionScanner` had modal state, imports, and helper functions added outside the component function body (after the closing brace) by iterative AI edits | Runtime crash; dead code that was never used |
| `PositionTable` had a `useMemo` with a side effect (fetch) — fundamentally wrong hook usage | Data freshness bugs, React warnings |
| Dashboard page uses raw `fetch` with manual loading/error state instead of React Query | Inconsistent loading UX compared to the rest of the app |
| `TopOpportunities` and `AprComparison` duplicate the same platform-links lookup, freshness formatter, and trend arrow helpers | Any copy-paste divergence causes UI inconsistency |

### 5. Configuration & Environment

| Flaw | Impact |
|------|--------|
| `env.ts` manually reads and parses `.env.local` and `.env.secrets` via `fs.readFileSync` at module load time | Breaks in edge runtimes; Next.js already handles env files natively |
| `next.config.js` and `next.config.ts` coexisted for a period | Unpredictable which one Next.js picked up |
| `ENABLE_LIVE_EXCHANGE_FETCH` is a string comparison (`=== 'true'`) not a boolean env; easy to misconfigure | Live fetch silently disabled in production |
| No health-check endpoint that validates the actual data pipeline (DB connected, last sync age, sample vs live mode) | Impossible to diagnose "why is production showing old data" without SSH access |

### 6. Testing

| Flaw | Impact |
|------|--------|
| Zero tests existed at the start; smoke tests were only added after the build was already broken | Regressions went undetected across many editing sessions |
| `pnpm test` script pointed to a file that did not exist | CI/CD would silently fail |

---

## Architectural mistakes to avoid

1. No separation between live exchange fetch and user-facing reads. The current app hits exchanges (or times out at 502) on every page load. The fix is a background cron that writes to DB, and all API routes read only from DB.

2. Two parallel adapter files with duplicate class names. Pick one adapter contract and stick to it from day one.

3. Inconsistent API response envelopes. Every route returns a different shape, forcing fragile fallback chains in every consumer. Define one envelope up front.

4. Auth tokens in localStorage on the user document. Should be httpOnly cookies + a dedicated sessions collection.

5. Manual fs.readFileSync env parsing instead of letting Next.js handle it natively — this breaks in edge runtimes and adds complexity for nothing.

6. setInterval APR sync inside the Next.js process called from layout.tsx, which fires per worker, per restart, and explains the 502s you saw in production.

7. Zero tests until things broke. Start with a test scaffold before any routes are built.


## Recommended Approach for the Rebuild

### Single Responsibility, Clear Layers

```
exchanges/         ← one adapter per exchange, one interface, no logic leakage
services/          ← AprService (reads from DB), AprSyncJob (writes from exchanges)
repositories/      ← thin DB wrappers, one file per collection
api routes/        ← thin handlers: validate → call service → return consistent envelope
components/        ← one component per file, no logic outside the function body
```

### APR Data Flow

1. A **separate process** (cron job, not `setInterval`) calls `/api/cron/refresh-apr` on a schedule.
2. The cron writes into the `apr_snapshots` collection.
3. All user-facing API routes read **only from DB** — never from the exchange directly.
4. Result: every page load is a fast DB read; live latency never touches the user.

### Auth

- Session tokens stored in `sessions` collection with `userId`, `token` (hashed), `expiresAt`, `createdAt`.
- Token delivered to client as `httpOnly`, `Secure`, `SameSite=Strict` cookie.
- `/api/auth/me` reads from the sessions collection, not the users document.

### Consistent API Envelope

Every route returns:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "human-readable message", "code": "MACHINE_CODE" }
```
Never a bare array. Never a nested `data.data`.

### Environment

- Remove the manual `fs.readFileSync` env loader. Let Next.js handle `.env.local` natively.
- Use a Zod schema to validate `process.env` once at startup, export typed `env` object.
- Keep `ENABLE_LIVE_EXCHANGE_FETCH` but validate it as `z.enum(['true', 'false']).default('false')`.

### Testing from Day One

- Unit tests for each exchange adapter (mock fetch, assert shape).
- Integration tests for repository functions (in-memory Mongo or test Atlas cluster).
- Smoke tests for API routes (assert envelope shape and HTTP status).
- Run on every build before deployment.

---

## MongoDB — Keep the Same Instance

### Keep the Docker setup as-is

The setup in `mongodb/docker-compose.yaml` is clean and production-ready:
- MongoDB 7.0 with TLS (`requireTLS`), self-signed CA in `mongodb/tls-certs/`
- Data persisted at `mongodb/db_data/` on the host
- Custom admin UI at `mongodb/mongo-admin/` (runs on port 3000)

**Do not replace or recreate the Docker setup.** For the rebuild, point `MONGODB_URI` in `.env.local` at the same running container. The connection helper (`src/lib/db/mongodb.ts`) is also worth keeping — it handles URI masking in logs and graceful fallback to sample data when Mongo is unreachable.

---

### Collections — what to keep and what to change

| Collection | Status | Notes |
|---|---|---|
| `portfolios` | **Keep** | Schema is clean; existing user data is preserved |
| `positions` | **Keep** | Same |
| `position_history` | **Keep** | Same |
| `position_snapshots` | **Keep** | Redundant with `position_history` but harmless; consolidate later |
| `apr_snapshots` | **Keep** | Primary APR data written by the sync job |
| `apr_history` | **Keep** | Trend data; keep as-is |
| `apr_data` | **Discard** | Only referenced by `src/app/api/positions/route.ts`; inconsistent with `apr_snapshots`; one of them is wrong — the rebuild should use `apr_snapshots` only |
| `users` | **Migrate** | Currently stores session tokens (`sessionToken`, `sessionExpiresAt`) AND exchange API keys directly on the user document. In the rebuild, strip those fields from `users` and move them to dedicated collections (see below) |
| `alerts` | **Keep** | Schema is simple; no changes needed |
| `notifications` | **Keep** | Same |
| `oauth_states` | **Discard** | OAuth flow was never wired end-to-end; collection will be empty in practice |

---

### New collections needed in the rebuild

**`sessions`** — replaces the `sessionToken`/`sessionExpiresAt` fields on the user document:
```js
{
  _id: ObjectId,
  userId: ObjectId,        // ref to users._id
  tokenHash: string,       // SHA-256 of the actual token; never store raw
  createdAt: Date,
  expiresAt: Date,
  userAgent: string        // optional, for session management UI
}
// Index: { tokenHash: 1 } unique, { expiresAt: 1 } TTL
```

**`exchange_keys`** — replaces the `exchangeKeys` array embedded on the user document:
```js
{
  _id: ObjectId,
  userId: ObjectId,
  exchange: 'binance' | 'okx' | 'kucoin',
  apiKey: string,          // store encrypted at rest if possible
  apiSecret: string,       // encrypted
  passphrase: string,      // KuCoin only; encrypted
  createdAt: Date,
  lastVerifiedAt: Date
}
// Index: { userId: 1, exchange: 1 } unique
```

---

## File Migration Guide

All paths are relative to `/home/san/apr-hunter/`.

---

### Copy directly — no changes needed

These files are clean. Copy them as-is into the new project at the same relative path.

```
src/components/Header.tsx
src/components/PortfolioCard.tsx
src/components/PortfolioForm.tsx
src/components/PositionForm.tsx
src/components/PositionHistory.tsx
src/components/WalletConnect.tsx
src/components/Web3PositionCard.tsx
src/components/Web3PositionsList.tsx
src/components/notification-bell.tsx

src/types/apr.ts
src/types/portfolio.ts
src/types/web3.ts

src/lib/data/sampleAprRates.ts

src/lib/web3/config.ts
src/lib/web3/position-reader/aave.ts
src/lib/web3/position-reader/abis.ts
src/lib/web3/position-reader/addresses.ts
src/lib/web3/position-reader/core.ts
src/lib/web3/position-reader/erc20.ts
src/lib/web3/position-reader/index.ts
src/lib/web3/position-reader/lido.ts
src/lib/web3/position-reader/yearn.ts

src/app/globals.css

tailwind.config.ts
postcss.config.js
tsconfig.json
ecosystem.config.cjs
```

---

### Copy and strip — keep the UI markup, replace the data/logic wiring

Copy the file, then remove or rewrite the parts noted below.

| File | What to remove / rewrite |
|---|---|
| `src/components/top-opportunities.tsx` | Replace the `useQuery` calls and `api.get` calls with props passed from the parent page |
| `src/components/apr-comparison.tsx` | Same — remove direct `api.get` calls; receive data as props |
| `src/components/PositionTable.tsx` | Remove the `useMemo` that contained a `fetch` side effect; prices should be passed as a prop |
| `src/components/Web3PositionScanner.tsx` | Remove everything after the closing `}` of the component function (dead modal scaffold); replace inline `fetch('/api/portfolios')` with a React Query hook |
| `src/components/ImportWeb3PositionDialog.tsx` | Keep markup, rewire the submit handler to the new import API endpoint |
| `src/components/ExchangeKeysSettings.tsx` | Keep form UI, replace all fetch calls with React Query mutations |
| `src/app/page.tsx` | Keep markup and layout; replace `TopOpportunities`/`AprComparison` with versions that accept data as props fetched server-side |
| `src/app/dashboard/page.tsx` | Keep layout structure; replace all raw `fetch` + manual `useState` loading with React Query hooks |
| `src/app/layout.tsx` | Keep providers; remove the `initializeServer()` import and call entirely |

---

### Extract the signing logic — do not copy the file structure

The HMAC signing helpers inside `src/lib/exchanges/cex-adapter.ts` are correct and tested. Copy only the **functions**, not the class hierarchy:

- `generateSignature` (Binance)
- `binanceAuthenticatedRequest`
- `generateOkxSignature` + `okxAuthenticatedRequest` (from `src/lib/exchanges/registry.ts`)
- `generateKucoinSignature` + `encryptKucoinPassphrase` + `kucoinAuthenticatedRequest` (from `src/lib/exchanges/registry.ts`)

In the new project, place each in its own file: `exchanges/binance.ts`, `exchanges/okx.ts`, `exchanges/kucoin.ts`.

---

### Discard entirely — do not copy

```
src/lib/env.ts                          ← manual fs.readFileSync env parser; use native Next.js env + Zod instead
src/lib/init-server.ts                  ← setInterval APR sync inside the process; use external cron
src/lib/services/apr-sync.ts           ← same reason
src/lib/exchanges/cex-adapter-oauth.ts ← OAuth flow was never wired end-to-end; plain API keys are enough for Phase 1
src/lib/exchanges/registry.ts          ← 600-line god file; extract signing logic (see above) then discard
src/lib/exchanges/cex-adapter.ts       ← extract signing logic (see above) then discard; class hierarchy is tangled
src/lib/api.ts                         ← rewrite with typed endpoints and consistent error handling
src/lib/auth.tsx                       ← rewrite with httpOnly cookie approach and a sessions collection
src/middleware.ts                      ← deprecated convention (becomes proxy.ts in Next 16); rewrite if needed
src/pages/                             ← entire directory; commit to App Router only
src/app/api/db-status/route.js         ← .js not .ts; rewrite in TypeScript if a health endpoint is needed
next.config.js                         ← replace with a single clean next.config.ts in the new project
test-connection-unified.js             ← replace with a proper test runner setup (e.g. Vitest)
docs/                                  ← do not copy; start fresh documentation in the new project
```
