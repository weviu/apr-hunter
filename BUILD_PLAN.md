# APR Hunter V2 — Complete Build Plan

> Source of truth for the rebuild. Do not begin implementation until open questions in §8 are resolved.
> All paths are relative to `/home/san/apr-hunterV2/` unless prefixed with `/home/san/apr-hunter/` (the old project).

---

## 1. Project Scaffold

```
apr-hunterV2/
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # Providers only — no initializeServer
│   │   ├── page.tsx                           # Public landing / APR leaderboard (server component)
│   │   ├── globals.css
│   │   ├── favicon.ico
│   │   ├── icon.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── portfolios/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── positions/
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── alerts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts                   # DB connected, last sync age, sample vs live
│   │       ├── auth/
│   │       │   ├── register/
│   │       │   │   └── route.ts
│   │       │   ├── login/
│   │       │   │   └── route.ts
│   │       │   ├── logout/
│   │       │   │   └── route.ts
│   │       │   └── me/
│   │       │       └── route.ts
│   │       ├── apr/
│   │       │   ├── route.ts                   # All current rates from DB
│   │       │   ├── top/
│   │       │   │   └── route.ts               # Top N by APR
│   │       │   ├── assets/
│   │       │   │   └── route.ts               # Unique asset list
│   │       │   ├── asset/
│   │       │   │   └── [symbol]/
│   │       │   │       └── route.ts           # Single asset detail
│   │       │   ├── history/
│   │       │   │   └── route.ts               # APR trend over time
│   │       │   └── trends/
│   │       │       └── route.ts               # Direction deltas
│   │       ├── cron/
│   │       │   └── refresh-apr/
│   │       │       └── route.ts               # Called by external cron only
│   │       ├── portfolios/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── positions/
│   │       │           ├── route.ts
│   │       │           └── [positionId]/
│   │       │               ├── route.ts
│   │       │               └── snapshots/
│   │       │                   └── route.ts
│   │       ├── positions/
│   │       │   ├── route.ts
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   └── stats/
│   │       │       └── route.ts
│   │       ├── portfolio/
│   │       │   └── import-web3-position/
│   │       │       └── route.ts
│   │       ├── exchanges/
│   │       │   ├── route.ts                   # CRUD for exchange_keys
│   │       │   ├── connected/
│   │       │   │   └── route.ts
│   │       │   └── holdings/
│   │       │       └── route.ts
│   │       ├── alerts/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── notifications/
│   │       │   ├── route.ts
│   │       │   ├── read-all/
│   │       │   │   └── route.ts
│   │       │   ├── clear-read/
│   │       │   │   └── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── read/
│   │       │           └── route.ts
│   │       └── web3/
│   │           └── detect-positions/
│   │               └── route.ts
│   ├── components/
│   │   ├── providers/
│   │   │   └── react-query-provider.tsx
│   │   ├── Header.tsx
│   │   ├── top-opportunities.tsx
│   │   ├── apr-comparison.tsx
│   │   ├── PortfolioCard.tsx
│   │   ├── PortfolioForm.tsx
│   │   ├── PositionForm.tsx
│   │   ├── PositionTable.tsx
│   │   ├── PositionHistory.tsx
│   │   ├── ExchangeKeysSettings.tsx
│   │   ├── ImportWeb3PositionDialog.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── Web3Provider.tsx
│   │   ├── Web3PositionCard.tsx
│   │   ├── Web3PositionsList.tsx
│   │   ├── Web3PositionScanner.tsx
│   │   └── notification-bell.tsx
│   ├── exchanges/                             # NEW — one file per exchange adapter
│   │   ├── binance.ts
│   │   ├── okx.ts
│   │   ├── kucoin.ts
│   │   ├── aave.ts                            # DeFi protocol readers (APR side)
│   │   ├── yearn.ts
│   │   └── kraken.ts
│   ├── services/
│   │   ├── AprService.ts                      # Reads apr_snapshots from DB
│   │   ├── AprSyncJob.ts                      # Calls exchange adapters, writes to DB
│   │   ├── AuthService.ts                     # Register, login, session management
│   │   ├── PortfolioService.ts
│   │   ├── AlertService.ts
│   │   └── NotificationService.ts
│   ├── repositories/
│   │   ├── userRepository.ts
│   │   ├── sessionRepository.ts
│   │   ├── exchangeKeyRepository.ts
│   │   ├── aprRepository.ts
│   │   ├── portfolioRepository.ts
│   │   ├── positionRepository.ts
│   │   ├── alertRepository.ts
│   │   └── notificationRepository.ts
│   ├── lib/
│   │   ├── db/
│   │   │   └── mongodb.ts                     # Copy from old project
│   │   ├── env.ts                             # Zod-validated env — REWRITE (not copy)
│   │   ├── auth/
│   │   │   ├── cookies.ts                     # httpOnly cookie read/write helpers
│   │   │   └── session.ts                     # resolveSession(request) → user | null
│   │   ├── api/
│   │   │   ├── response.ts                    # ok() / err() envelope builders
│   │   │   └── withAuth.ts                    # Route guard HOF
│   │   ├── crypto/
│   │   │   └── encryption.ts                  # AES-256-GCM encrypt/decrypt for exchange keys
│   │   ├── data/
│   │   │   └── sampleAprRates.ts              # Copy from old project
│   │   ├── prices/
│   │   │   └── coin-gecko.ts                  # Copy from old project
│   │   ├── utils/
│   │   │   └── apr-utils.ts                   # Copy from old project
│   │   └── web3/
│   │       ├── config.ts
│   │       └── position-reader/
│   │           ├── aave.ts
│   │           ├── abis.ts
│   │           ├── addresses.ts
│   │           ├── core.ts
│   │           ├── erc20.ts
│   │           ├── index.ts
│   │           ├── lido.ts
│   │           └── yearn.ts
│   ├── hooks/
│   │   ├── useApr.ts
│   │   ├── usePortfolio.ts
│   │   ├── useExchangeKeys.ts
│   │   ├── useExchangeHoldings.ts
│   │   ├── useAlerts.ts
│   │   ├── useNotifications.ts
│   │   ├── useDetectWeb3Positions.ts
│   │   ├── useWeb3Chains.ts
│   │   └── useWeb3PositionDetection.ts
│   └── types/
│       ├── apr.ts
│       ├── portfolio.ts
│       └── web3.ts
├── tests/
│   ├── unit/
│   │   ├── exchanges/
│   │   │   ├── binance.test.ts
│   │   │   ├── okx.test.ts
│   │   │   └── kucoin.test.ts
│   │   ├── services/
│   │   │   ├── AprService.test.ts
│   │   │   └── AuthService.test.ts
│   │   └── lib/
│   │       ├── response.test.ts
│   │       └── encryption.test.ts
│   ├── integration/
│   │   ├── repositories/
│   │   │   ├── aprRepository.test.ts
│   │   │   ├── userRepository.test.ts
│   │   │   └── portfolioRepository.test.ts
│   │   └── services/
│   │       └── AprSyncJob.test.ts
│   └── smoke/
│       ├── api.health.test.ts
│       ├── api.apr.test.ts
│       └── api.auth.test.ts
├── .env.local                                 # Not committed
├── .env.example                               # Committed — all keys, no values
├── next.config.ts                             # Single config file — no next.config.js
├── tailwind.config.ts                         # Copy from old project
├── postcss.config.js                          # Copy from old project
├── tsconfig.json                              # Copy from old project
├── vitest.config.ts                           # NEW — replaces test-connection-unified.js
├── package.json
└── ecosystem.config.cjs                       # Copy from old project
```

---

## 2. Build Order

Each phase must be complete and passing before the next begins.

### Phase 0 — Scaffold & Config
Set up the blank Next.js project, install dependencies, configure TypeScript, Tailwind, and Vitest. No business logic. Reason: establishes a clean compile baseline so every subsequent file is added into a known-good project, not into accumulated debt.

### Phase 1 — Environment & Database Connection
Write `src/lib/env.ts` (Zod-validated) and copy `src/lib/db/mongodb.ts`. Write `src/app/api/health/route.ts`. Reason: every subsequent layer depends on env vars and a working DB connection. The health endpoint gives instant feedback that both are working before any business code is written.

### Phase 2 — Test Infrastructure
Configure Vitest, write test helpers (in-memory Mongo or test DB client), establish `tests/` folder structure, write the `response.test.ts` unit test for the envelope builders. Reason: the analysis explicitly requires tests before routes. Writing test infrastructure before repositories means repositories are written test-first.

### Phase 3 — Response Envelope & Auth Utilities
Write `src/lib/api/response.ts` (ok/err builders), `src/lib/auth/cookies.ts`, `src/lib/auth/session.ts`, `src/lib/api/withAuth.ts`. Reason: these are shared by every API route and every service test. Defining them first prevents inconsistency across the 30+ routes.

### Phase 4 — Data Model & Repositories
Write all repository files. Verify indexes exist in MongoDB. Write repository unit/integration tests. Reason: services are thin wrappers over repositories; you cannot test a service without its repository being defined and reliable.

### Phase 5 — Exchange Adapters
Write `src/exchanges/binance.ts`, `okx.ts`, `kucoin.ts` (extract signing logic from old files). Write unit tests with mocked fetch for each. Reason: the APR sync job depends on these; the sync job must not be built until adapters are individually verified.

### Phase 6 — Core Services
Write `AuthService`, `AprService`, `AprSyncJob`, `PortfolioService`, `AlertService`, `NotificationService`. Write service-level tests. Reason: services are the only layer that contains business logic; routes should be thin delegates to services, so services must be solid before routes.

### Phase 7 — API Routes
Write all route handlers using `withAuth`, `ok()`, `err()`, and direct service calls. Smoke-test each route. Reason: with services and repositories already tested, routes become trivial validation → service call → envelope. Writing them last keeps the handlers short.

### Phase 8 — Copy & Strip Components
Copy components from old project per the migration guide. Strip bad wiring, reconnect to React Query hooks. Reason: UI work is isolated from business logic; doing it last means the API surface is frozen and components can wire to stable endpoints.

### Phase 9 — Pages
Assemble app pages, server components fetching from the now-stable API layer. Connect nav, layout, auth flow.

### Phase 10 — Cron & Deployment Config
Wire `ecosystem.config.cjs` cron entry for `/api/cron/refresh-apr`, configure rate-limiting middleware, write final smoke tests, production env check.

---

## 3. File List Per Phase

### Phase 0 — Scaffold & Config

| File | Action |
|------|--------|
| `package.json` | Create — see dependency list in §6 |
| `next.config.ts` | Create — App Router only, no pages dir |
| `tsconfig.json` | Copy from `/home/san/apr-hunter/tsconfig.json` |
| `tailwind.config.ts` | Copy from `/home/san/apr-hunter/tailwind.config.ts` |
| `postcss.config.js` | Copy from `/home/san/apr-hunter/postcss.config.js` |
| `vitest.config.ts` | Create — new |
| `.env.example` | Create — all required keys, no values |
| `src/app/globals.css` | Copy from `/home/san/apr-hunter/src/app/globals.css` |
| `src/app/favicon.ico` | Copy |
| `src/app/icon.tsx` | Copy |
| `src/components/providers/react-query-provider.tsx` | Copy from old project |

### Phase 1 — Environment & Database Connection

| File | Action |
|------|--------|
| `src/lib/env.ts` | **Rewrite** — Zod schema replacing manual fs.readFileSync parser |
| `src/lib/db/mongodb.ts` | Copy from `/home/san/apr-hunter/src/lib/db/mongodb.ts` |
| `src/app/api/health/route.ts` | Create — new endpoint |

### Phase 2 — Test Infrastructure

| File | Action |
|------|--------|
| `vitest.config.ts` | Finalise — add test DB URL, global setup |
| `tests/helpers/db.ts` | Create — connect/disconnect test DB, drop collections between tests |
| `tests/helpers/fixtures.ts` | Create — minimal document factories for each collection |

### Phase 3 — Response Envelope & Auth Utilities

| File | Action |
|------|--------|
| `src/lib/api/response.ts` | Create — `ok(data)` and `err(message, code, status)` |
| `src/lib/api/withAuth.ts` | Create — HOF that resolves session from cookie or returns 401 |
| `src/lib/auth/cookies.ts` | Create — `setSessionCookie` / `clearSessionCookie` / `getSessionToken` |
| `src/lib/auth/session.ts` | Create — `resolveSession(request)` → `{ user, session } \| null` |
| `src/lib/crypto/encryption.ts` | Create — AES-256-GCM encrypt/decrypt for exchange API secrets |
| `tests/unit/lib/response.test.ts` | Create |
| `tests/unit/lib/encryption.test.ts` | Create |

### Phase 4 — Data Model & Repositories

| File | Action |
|------|--------|
| `src/types/apr.ts` | Copy from `/home/san/apr-hunter/src/types/apr.ts` |
| `src/types/portfolio.ts` | Copy from `/home/san/apr-hunter/src/types/portfolio.ts` |
| `src/types/web3.ts` | Copy from `/home/san/apr-hunter/src/types/web3.ts` |
| `src/repositories/userRepository.ts` | Create — find, create, updatePassword; no session fields |
| `src/repositories/sessionRepository.ts` | Create — create, findByTokenHash, deleteById, deleteExpired |
| `src/repositories/exchangeKeyRepository.ts` | Create — upsert, findByUserId, deleteByUserAndExchange |
| `src/repositories/aprRepository.ts` | **Rewrite** from `/home/san/apr-hunter/src/lib/db/repositories/aprRepository.ts` — use `apr_snapshots` only; remove `apr_data` references |
| `src/repositories/portfolioRepository.ts` | **Rewrite** from `/home/san/apr-hunter/src/lib/db/repositories/portfolioRepository.ts` — standardise on soft-delete only; remove hard-delete paths |
| `src/repositories/positionRepository.ts` | Create — extracted from old portfolio repository |
| `src/repositories/alertRepository.ts` | Create |
| `src/repositories/notificationRepository.ts` | Create |
| `tests/integration/repositories/aprRepository.test.ts` | Create |
| `tests/integration/repositories/userRepository.test.ts` | Create |
| `tests/integration/repositories/portfolioRepository.test.ts` | Create |

### Phase 5 — Exchange Adapters

| File | Action |
|------|--------|
| `src/exchanges/binance.ts` | **Extract** signing logic from `/home/san/apr-hunter/src/lib/exchanges/cex-adapter.ts` — `generateSignature`, `binanceAuthenticatedRequest`, APR fetch function |
| `src/exchanges/okx.ts` | **Extract** from `/home/san/apr-hunter/src/lib/exchanges/registry.ts` — `generateOkxSignature`, `okxAuthenticatedRequest`, APR fetch |
| `src/exchanges/kucoin.ts` | **Extract** from `/home/san/apr-hunter/src/lib/exchanges/registry.ts` — `generateKucoinSignature`, `encryptKucoinPassphrase`, `kucoinAuthenticatedRequest`, APR fetch |
| `src/exchanges/kraken.ts` | Create — public API only; no auth needed for staking rates |
| `src/exchanges/aave.ts` | Minimal wrapper delegating to `src/lib/web3/position-reader/aave.ts` |
| `src/exchanges/yearn.ts` | Minimal wrapper delegating to `src/lib/web3/position-reader/yearn.ts` |
| `src/lib/web3/config.ts` | Copy from `/home/san/apr-hunter/src/lib/web3/config.ts` |
| `src/lib/web3/position-reader/aave.ts` | Copy |
| `src/lib/web3/position-reader/abis.ts` | Copy |
| `src/lib/web3/position-reader/addresses.ts` | Copy |
| `src/lib/web3/position-reader/core.ts` | Copy |
| `src/lib/web3/position-reader/erc20.ts` | Copy |
| `src/lib/web3/position-reader/index.ts` | Copy |
| `src/lib/web3/position-reader/lido.ts` | Copy |
| `src/lib/web3/position-reader/yearn.ts` | Copy |
| `src/lib/data/sampleAprRates.ts` | Copy from `/home/san/apr-hunter/src/lib/data/sampleAprRates.ts` |
| `src/lib/prices/coin-gecko.ts` | Copy from `/home/san/apr-hunter/src/lib/prices/coin-gecko.ts` |
| `src/lib/utils/apr-utils.ts` | Copy from `/home/san/apr-hunter/src/lib/utils/apr-utils.ts` |
| `tests/unit/exchanges/binance.test.ts` | Create |
| `tests/unit/exchanges/okx.test.ts` | Create |
| `tests/unit/exchanges/kucoin.test.ts` | Create |

### Phase 6 — Core Services

| File | Action |
|------|--------|
| `src/services/AprService.ts` | Create — reads from `apr_snapshots` via aprRepository; never calls exchanges |
| `src/services/AprSyncJob.ts` | Create — calls exchange adapters, writes to `apr_snapshots` and `apr_history` |
| `src/services/AuthService.ts` | Create — register (hash password), login (verify + create session), logout (delete session), me (resolve session) |
| `src/services/PortfolioService.ts` | Create — delegates to portfolioRepository and positionRepository |
| `src/services/AlertService.ts` | Create — evaluate thresholds against latest apr_snapshots, emit notifications |
| `src/services/NotificationService.ts` | Create — list, mark read, clear |
| `tests/unit/services/AprService.test.ts` | Create |
| `tests/unit/services/AuthService.test.ts` | Create |
| `tests/integration/services/AprSyncJob.test.ts` | Create |

### Phase 7 — API Routes

All routes listed in §4. Create each file. Write smoke tests in parallel.

| Smoke test file | Create |
|-----------------|--------|
| `tests/smoke/api.health.test.ts` | Create |
| `tests/smoke/api.apr.test.ts` | Create |
| `tests/smoke/api.auth.test.ts` | Create |

### Phase 8 — Copy & Strip Components

| File | Action |
|------|--------|
| `src/components/Header.tsx` | Copy as-is |
| `src/components/PortfolioCard.tsx` | Copy as-is |
| `src/components/PortfolioForm.tsx` | Copy as-is |
| `src/components/PositionForm.tsx` | Copy as-is |
| `src/components/PositionHistory.tsx` | Copy as-is |
| `src/components/WalletConnect.tsx` | Copy as-is |
| `src/components/Web3PositionCard.tsx` | Copy as-is |
| `src/components/Web3PositionsList.tsx` | Copy as-is |
| `src/components/notification-bell.tsx` | Copy as-is |
| `src/components/top-opportunities.tsx` | Strip `useQuery`/`api.get` calls; receive data as props |
| `src/components/apr-comparison.tsx` | Strip `useQuery`/`api.get` calls; receive data as props |
| `src/components/PositionTable.tsx` | Remove `useMemo` with fetch side effect; accept `prices` prop |
| `src/components/Web3PositionScanner.tsx` | Remove dead code after closing `}`; replace inline fetch with `usePortfolio` hook |
| `src/components/ImportWeb3PositionDialog.tsx` | Keep markup; rewire submit to `/api/portfolio/import-web3-position` via mutation |
| `src/components/ExchangeKeysSettings.tsx` | Keep form; replace fetch calls with `useExchangeKeys` React Query mutations |
| `src/components/Web3Provider.tsx` | Copy from old project |
| `src/hooks/useApr.ts` | Create — wraps `/api/apr` and `/api/apr/top` |
| `src/hooks/usePortfolio.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/usePortfolio.ts` |
| `src/hooks/useExchangeKeys.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/useExchangeKeys.ts` |
| `src/hooks/useExchangeHoldings.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/useExchangeHoldings.ts` |
| `src/hooks/useAlerts.ts` | Create |
| `src/hooks/useNotifications.ts` | Create |
| `src/hooks/useDetectWeb3Positions.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/useDetectWeb3Positions.ts` |
| `src/hooks/useWeb3Chains.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/useWeb3Chains.ts` |
| `src/hooks/useWeb3PositionDetection.ts` | Copy from `/home/san/apr-hunter/src/lib/hooks/useWeb3PositionDetection.ts` |

### Phase 9 — Pages

| File | Action |
|------|--------|
| `src/app/layout.tsx` | Strip `initializeServer()`; keep providers |
| `src/app/page.tsx` | Strip raw fetch + manual state; pass data as props to top-opportunities / apr-comparison |
| `src/app/login/page.tsx` | Copy from old project, rewire to use httpOnly cookie auth flow |
| `src/app/register/page.tsx` | Copy, rewire |
| `src/app/dashboard/page.tsx` | Strip raw fetch/useState; use React Query hooks |
| `src/app/dashboard/portfolios/page.tsx` | Copy, rewire |
| `src/app/dashboard/portfolios/[id]/page.tsx` | Copy, rewire |
| `src/app/dashboard/positions/new/page.tsx` | Copy, rewire |
| `src/app/dashboard/alerts/page.tsx` | Copy, rewire |
| `src/app/dashboard/alerts/new/page.tsx` | Copy, rewire |
| `src/app/dashboard/notifications/page.tsx` | Copy, rewire |
| `src/app/dashboard/settings/page.tsx` | Copy, rewire |

### Phase 10 — Cron & Deployment Config

| File | Action |
|------|--------|
| `ecosystem.config.cjs` | Copy from `/home/san/apr-hunter/ecosystem.config.cjs`; update app name and cron schedule entry |
| `src/middleware.ts` | Create — rate-limit APR and portfolio routes; skip public routes |

---

## 4. API Route Map

All responses follow one of:
```
{ "success": true, "data": <T> }
{ "success": false, "error": "<human message>", "code": "<MACHINE_CODE>" }
```

### Health

| Route | Method | Auth | Request | Response `data` | Service / Repo |
|-------|--------|------|---------|-----------------|----------------|
| `/api/health` | GET | None | — | `{ db: "connected"\|"error", lastSyncAt: ISO8601\|null, mode: "live"\|"sample", syncAgeSeconds: number }` | `aprRepository.getLatestSyncTimestamp()` |

### Auth

| Route | Method | Auth | Request Body | Response `data` | Service / Repo |
|-------|--------|------|-------------|-----------------|----------------|
| `/api/auth/register` | POST | None | `{ email, password, name }` | `{ user: { id, email, name } }` | `AuthService.register()` |
| `/api/auth/login` | POST | None | `{ email, password }` | `{ user: { id, email, name } }` + sets `session` httpOnly cookie | `AuthService.login()` |
| `/api/auth/logout` | POST | Cookie | — | `{ ok: true }` + clears cookie | `AuthService.logout()` |
| `/api/auth/me` | GET | Cookie | — | `{ user: { id, email, name } }` | `AuthService.me()` |

### APR

| Route | Method | Auth | Query Params | Response `data` | Service |
|-------|--------|------|-------------|-----------------|---------|
| `/api/apr` | GET | None | `exchange?`, `asset?` | `AprSnapshot[]` | `AprService.getAll()` |
| `/api/apr/top` | GET | None | `limit=10` | `AprSnapshot[]` | `AprService.getTop(limit)` |
| `/api/apr/assets` | GET | None | — | `string[]` | `AprService.getUniqueAssets()` |
| `/api/apr/asset/[symbol]` | GET | None | — | `{ symbol, rates: AprSnapshot[] }` | `AprService.getByAsset(symbol)` |
| `/api/apr/history` | GET | None | `exchange?`, `asset?`, `days=30` | `AprHistoryEntry[]` | `AprService.getHistory()` |
| `/api/apr/trends` | GET | None | `limit=10` | `{ symbol, exchange, direction, delta }[]` | `AprService.getTrends()` |

### Cron

| Route | Method | Auth | Request Headers | Response `data` | Service |
|-------|--------|------|----------------|-----------------|---------|
| `/api/cron/refresh-apr` | POST | `X-Cron-Secret` header (server-side constant time compare) | — | `{ synced: number, failed: string[] }` | `AprSyncJob.run()` |

Note: this route must not be callable from the browser. Validate with `X-Cron-Secret` compared via `crypto.timingSafeEqual`. Consider adding an IP allowlist for the cron runner.

### Portfolios

| Route | Method | Auth | Request | Response `data` | Service |
|-------|--------|------|---------|-----------------|---------|
| `/api/portfolios` | GET | Cookie | — | `Portfolio[]` | `PortfolioService.listForUser(userId)` |
| `/api/portfolios` | POST | Cookie | `{ name, description? }` | `Portfolio` | `PortfolioService.create()` |
| `/api/portfolios/[id]` | GET | Cookie | — | `Portfolio` | `PortfolioService.getById()` |
| `/api/portfolios/[id]` | PATCH | Cookie | `{ name?, description? }` | `Portfolio` | `PortfolioService.update()` |
| `/api/portfolios/[id]` | DELETE | Cookie | — | `{ id }` | `PortfolioService.softDelete()` |
| `/api/portfolios/[id]/positions` | GET | Cookie | — | `Position[]` | `PortfolioService.getPositions()` |
| `/api/portfolios/[id]/positions` | POST | Cookie | `{ asset, exchange, amount, aprAtEntry, stakedAt }` | `Position` | `PortfolioService.addPosition()` |
| `/api/portfolios/[id]/positions/[positionId]` | GET | Cookie | — | `Position` | `PortfolioService.getPosition()` |
| `/api/portfolios/[id]/positions/[positionId]` | PATCH | Cookie | `{ amount?, notes? }` | `Position` | `PortfolioService.updatePosition()` |
| `/api/portfolios/[id]/positions/[positionId]` | DELETE | Cookie | — | `{ id }` | `PortfolioService.closePosition()` |
| `/api/portfolios/[id]/positions/[positionId]/snapshots` | GET | Cookie | `?days=30` | `Snapshot[]` | `PortfolioService.getPositionSnapshots()` |

### Positions (cross-portfolio)

| Route | Method | Auth | Request | Response `data` | Service |
|-------|--------|------|---------|-----------------|---------|
| `/api/positions` | GET | Cookie | `?portfolioId?` | `Position[]` | `PortfolioService.listAllForUser()` |
| `/api/positions/[id]` | GET | Cookie | — | `Position` | `PortfolioService.getPosition()` |
| `/api/positions/[id]` | PATCH | Cookie | `{ amount?, notes? }` | `Position` | `PortfolioService.updatePosition()` |
| `/api/positions/stats` | GET | Cookie | — | `{ totalValue, totalEarned, byExchange }` | `PortfolioService.getStats()` |

### Web3 Import

| Route | Method | Auth | Request Body | Response `data` | Service |
|-------|--------|------|-------------|-----------------|---------|
| `/api/portfolio/import-web3-position` | POST | Cookie | `{ portfolioId, walletAddress, chainId, protocol, asset, amount }` | `Position` | `PortfolioService.importWeb3Position()` |
| `/api/web3/detect-positions` | POST | Cookie | `{ walletAddress, chains: string[] }` | `Web3Position[]` | delegates to `src/lib/web3/position-reader/` |

### Exchanges

| Route | Method | Auth | Request Body | Response `data` | Service |
|-------|--------|------|-------------|-----------------|---------|
| `/api/exchanges` | GET | Cookie | — | `{ exchange, hasKey, lastVerifiedAt }[]` | `exchangeKeyRepository.findByUserId()` |
| `/api/exchanges` | POST | Cookie | `{ exchange, apiKey, apiSecret, passphrase? }` | `{ exchange, lastVerifiedAt }` | verifies key then calls `exchangeKeyRepository.upsert()` |
| `/api/exchanges` | DELETE | Cookie | `{ exchange }` | `{ exchange }` | `exchangeKeyRepository.deleteByUserAndExchange()` |
| `/api/exchanges/connected` | GET | Cookie | — | `string[]` (list of connected exchanges) | `exchangeKeyRepository.findByUserId()` |
| `/api/exchanges/holdings` | GET | Cookie | `?exchange=` | `{ asset, amount, aprCurrent }[]` | calls live exchange adapter with stored key |

### Alerts

| Route | Method | Auth | Request | Response `data` | Service |
|-------|--------|------|---------|-----------------|---------|
| `/api/alerts` | GET | Cookie | — | `Alert[]` | `AlertService.listForUser()` |
| `/api/alerts` | POST | Cookie | `{ asset, exchange, condition: 'above'\|'below', threshold }` | `Alert` | `AlertService.create()` |
| `/api/alerts/[id]` | PATCH | Cookie | `{ threshold?, active? }` | `Alert` | `AlertService.update()` |
| `/api/alerts/[id]` | DELETE | Cookie | — | `{ id }` | `AlertService.delete()` |

Note: alert evaluation is triggered by `AprSyncJob.run()` internally after each successful sync — not via a public HTTP endpoint.

### Notifications

| Route | Method | Auth | Request | Response `data` | Service |
|-------|--------|------|---------|-----------------|---------|
| `/api/notifications` | GET | Cookie | `?unreadOnly=` | `Notification[]` | `NotificationService.list()` |
| `/api/notifications/[id]` | GET | Cookie | — | `Notification` | `NotificationService.getById()` |
| `/api/notifications/[id]` | DELETE | Cookie | — | `{ id }` | `NotificationService.delete()` |
| `/api/notifications/[id]/read` | POST | Cookie | — | `Notification` | `NotificationService.markRead()` |
| `/api/notifications/read-all` | POST | Cookie | — | `{ count }` | `NotificationService.markAllRead()` |
| `/api/notifications/clear-read` | DELETE | Cookie | — | `{ count }` | `NotificationService.clearRead()` |

---

## 5. Data Models

### `users`

```ts
{
  _id:          ObjectId,
  email:        string,          // lowercase, trimmed
  passwordHash: string,          // bcrypt, cost ≥ 12
  name:         string,
  createdAt:    Date,
  updatedAt:    Date
}
```

Indexes:
- `{ email: 1 }` — unique

Fields intentionally absent vs old schema: `sessionToken`, `sessionExpiresAt`, `exchangeKeys[]`.

---

### `sessions`

```ts
{
  _id:        ObjectId,
  userId:     ObjectId,          // ref: users._id
  tokenHash:  string,            // SHA-256(rawToken) — never store raw
  createdAt:  Date,
  expiresAt:  Date,
  userAgent:  string             // optional
}
```

Indexes:
- `{ tokenHash: 1 }` — unique
- `{ expiresAt: 1 }` — TTL (MongoDB auto-deletes expired documents)
- `{ userId: 1 }` — for listing/revoking all sessions by user

---

### `exchange_keys`

```ts
{
  _id:            ObjectId,
  userId:         ObjectId,      // ref: users._id
  exchange:       'binance' | 'okx' | 'kucoin' | 'kraken',
  apiKey:         string,        // encrypted at rest (AES-256-GCM)
  apiSecret:      string,        // encrypted
  passphrase:     string | null, // KuCoin only; encrypted; null for others
  createdAt:      Date,
  lastVerifiedAt: Date | null
}
```

Indexes:
- `{ userId: 1, exchange: 1 }` — unique (one key set per user per exchange)

---

### `portfolios`

```ts
{
  _id:         ObjectId,
  userId:      ObjectId,
  name:        string,
  description: string | null,
  createdAt:   Date,
  updatedAt:   Date,
  deletedAt:   Date | null       // soft-delete only
}
```

Indexes:
- `{ userId: 1, deletedAt: 1 }` — list active portfolios for a user

---

### `positions`

```ts
{
  _id:          ObjectId,
  portfolioId:  ObjectId,
  userId:       ObjectId,        // denormalised for fast user-scoped queries
  asset:        string,          // e.g. "USDT"
  exchange:     string,          // e.g. "binance"
  protocol:     string | null,   // e.g. "aave" for DeFi
  chainId:      number | null,   // for Web3 positions
  walletAddress: string | null,
  amount:       number,
  aprAtEntry:   number,          // % at time of entry
  stakedAt:     Date,
  closedAt:     Date | null,
  notes:        string | null,
  createdAt:    Date,
  updatedAt:    Date
}
```

Indexes:
- `{ portfolioId: 1, closedAt: 1 }`
- `{ userId: 1, closedAt: 1 }`

---

### `apr_snapshots`

```ts
{
  _id:        ObjectId,
  exchange:   string,            // "binance" | "okx" | "kucoin" | "kraken" | "aave" | "yearn"
  asset:      string,            // "USDT", "ETH", etc.
  product:    string | null,     // e.g. "Flexible Savings", "Locked 30d"
  apr:        number,            // annual percentage rate as decimal, e.g. 0.052 = 5.2%
  apy:        number | null,     // if exchange provides compounded figure
  minAmount:  number | null,
  currency:   string,            // "USD" | native token
  source:     'live' | 'sample',
  syncedAt:   Date               // when this row was written
}
```

Indexes:
- `{ exchange: 1, asset: 1, syncedAt: -1 }` — latest rate per exchange+asset
- `{ syncedAt: -1 }` — used by health endpoint for last sync age
- `{ asset: 1, syncedAt: -1 }` — used by asset detail endpoint

---

### `apr_history`

```ts
{
  _id:       ObjectId,
  exchange:  string,
  asset:     string,
  apr:       number,
  recordedAt: Date
}
```

Indexes:
- `{ exchange: 1, asset: 1, recordedAt: -1 }`

---

### `alerts`

```ts
{
  _id:        ObjectId,
  userId:     ObjectId,
  asset:      string,
  exchange:   string | null,     // null = any exchange
  condition:  'above' | 'below',
  threshold:  number,            // decimal, e.g. 0.05 = 5%
  active:     boolean,
  lastFiredAt: Date | null,
  createdAt:  Date,
  updatedAt:  Date
}
```

Indexes:
- `{ userId: 1, active: 1 }`
- `{ asset: 1, active: 1 }` — used by AlertService during sync evaluation

---

### `notifications`

```ts
{
  _id:       ObjectId,
  userId:    ObjectId,
  alertId:   ObjectId | null,
  type:      'apr_alert' | 'system',
  title:     string,
  body:      string,
  read:      boolean,
  createdAt: Date
}
```

Indexes:
- `{ userId: 1, read: 1, createdAt: -1 }`
- `{ createdAt: 1 }` — TTL (optional: auto-delete after 90 days)

---

## 6. Environment Variables

All variables are validated at startup by a Zod schema in `src/lib/env.ts`. The parsed, typed object is the only way other modules access env values — `process.env` is never read directly outside of `env.ts`.

### Server-only (never exposed to browser)

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `MONGODB_URI` | `string` (URI) | Yes | Points to same Docker MongoDB instance |
| `SESSION_SECRET` | `string` (≥ 32 chars) | Yes | Used to derive or sign session tokens |
| `ENCRYPTION_KEY` | `string` (hex, 64 chars = 32 bytes) | Yes | AES-256-GCM key for exchange API secrets at rest |
| `CRON_SECRET` | `string` (≥ 32 chars) | Yes | Compared with `X-Cron-Secret` header on `/api/cron/refresh-apr` |
| `BINANCE_API_KEY` | `string` | No | Server-side default key for public APR scraping (not user key) |
| `BINANCE_API_SECRET` | `string` | No | |
| `OKX_API_KEY` | `string` | No | |
| `OKX_API_SECRET` | `string` | No | |
| `OKX_PASSPHRASE` | `string` | No | |
| `KUCOIN_API_KEY` | `string` | No | |
| `KUCOIN_API_SECRET` | `string` | No | |
| `KUCOIN_PASSPHRASE` | `string` | No | |
| `ENABLE_LIVE_EXCHANGE_FETCH` | `z.enum(['true','false']).default('false')` | No | Guards live exchange calls |
| `COINGECKO_API_KEY` | `string` | No | For price lookups; falls back to public API if absent |

### Public (`NEXT_PUBLIC_` — available in browser)

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `string` (URL) | Yes | Base URL for the deployed app; used by React Query for absolute URLs in SSR |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `string` | Yes | RainbowKit / WalletConnect project ID |

### Zod schema shape (illustrative — not code)

```
server:
  MONGODB_URI               → z.string().url()
  SESSION_SECRET            → z.string().min(32)
  ENCRYPTION_KEY            → z.string().regex(/^[0-9a-f]{64}$/i)
  CRON_SECRET               → z.string().min(32)
  ENABLE_LIVE_EXCHANGE_FETCH → z.enum(['true','false']).default('false')
  BINANCE_API_KEY           → z.string().optional()
  ... (other exchange keys) → z.string().optional()
  COINGECKO_API_KEY         → z.string().optional()

client:
  NEXT_PUBLIC_APP_URL               → z.string().url()
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID → z.string().min(1)
```

---

## 7. Test Plan

Tests are written before routes (phases 2–6). The goal is a green test suite before any UI is built.

### Unit Tests

These have no external dependencies (no DB, no network). Mock everything at the boundary.

| Test file | What it tests |
|-----------|---------------|
| `tests/unit/lib/response.test.ts` | `ok()` returns `{ success: true, data }` with correct status; `err()` returns `{ success: false, error, code }` with correct status |
| `tests/unit/lib/encryption.test.ts` | Encrypt then decrypt round-trips; different IVs produce different ciphertext; tampered ciphertext throws |
| `tests/unit/exchanges/binance.test.ts` | `generateSignature` output matches known vector; `binanceAuthenticatedRequest` adds correct headers; APR fetch parses exchange response shape into `AprSnapshot` |
| `tests/unit/exchanges/okx.test.ts` | Same pattern — signature, headers, parse |
| `tests/unit/exchanges/kucoin.test.ts` | Same; additionally tests passphrase encryption |
| `tests/unit/services/AprService.test.ts` | `getAll()` returns snapshot list; `getTop(5)` returns exactly 5 sorted by apr desc; `getTrends()` returns correct direction when history has two points |
| `tests/unit/services/AuthService.test.ts` | `register` hashes password (stored hash ≠ input); `login` with wrong password returns null; `login` success creates session with hashed token |

### Integration Tests

These require a real MongoDB connection (test DB, separate from dev DB). Use `tests/helpers/db.ts` to connect and drop collections in `beforeEach`.

| Test file | What it tests |
|-----------|---------------|
| `tests/integration/repositories/userRepository.test.ts` | Create user; find by email; duplicate email throws; update; session fields are absent from schema |
| `tests/integration/repositories/aprRepository.test.ts` | Insert snapshot; getLatest returns newest per exchange+asset; getHistory respects date range |
| `tests/integration/repositories/portfolioRepository.test.ts` | Create; list excludes soft-deleted; softDelete sets deletedAt; hard delete path does not exist |
| `tests/integration/services/AprSyncJob.test.ts` | Mocks exchange adapters to return fixture data; asserts `apr_snapshots` collection has correct documents after `run()`; asserts `apr_history` gets one new entry per asset |

### Smoke Tests

These run against the live Next.js dev server (`http://localhost:3000`). They assert HTTP status and envelope shape only — not business logic.

| Test file | What it tests |
|-----------|---------------|
| `tests/smoke/api.health.test.ts` | `GET /api/health` returns 200, `{ success: true, data: { db, lastSyncAt, mode } }` |
| `tests/smoke/api.apr.test.ts` | `GET /api/apr` returns 200 and `success: true`; `GET /api/apr/top` returns array in `data`; non-existent asset returns 404 with `success: false` |
| `tests/smoke/api.auth.test.ts` | `POST /api/auth/register` with valid body returns 201; duplicate email returns 409 with `code: EMAIL_TAKEN`; `POST /api/auth/login` sets `Set-Cookie` header; `GET /api/auth/me` without cookie returns 401 |

### Test Runner Configuration (Vitest)

- Framework: Vitest (replaces the broken `test-connection-unified.js`)
- Environment: Node (not jsdom) for all API/service/repository tests
- Coverage: V8 provider; threshold: lines ≥ 70% before Phase 7 merge
- `pnpm test` runs unit + integration; `pnpm test:smoke` runs smoke (requires server running)

---

## 8. Open Questions

These must be answered before implementation begins. Each blocks a specific phase.

---

**Q1 — Cron mechanism (blocks Phase 10)**
The analysis recommends an external cron calling `/api/cron/refresh-apr`. Three options:
- **PM2 cron** via `ecosystem.config.cjs` (`cron_restart` or a separate PM2 cron worker that calls the endpoint)
- **System crontab** (`curl -X POST ... -H "X-Cron-Secret: ..."`)
- **Vercel/Railway cron** (if deploying to a platform)

Decision needed: which cron runner is in scope for Phase 1, and what is the desired sync interval?

---

**Q2 — Exchange key encryption strategy (blocks Phase 3 and Phase 4)**
The analysis requires exchange API keys to be "encrypted at rest." Two approaches:
- **App-level AES-256-GCM**: keys encrypted by `src/lib/crypto/encryption.ts` before write, decrypted on read. Simple, no infra dependency. The `ENCRYPTION_KEY` env var becomes a critical secret.
- **MongoDB client-side field encryption (CSFLE)**: keys encrypted by the MongoDB driver before the document ever leaves the app process. More robust but requires a KMS or local master key setup.

Decision needed: app-level AES-256-GCM is assumed in this plan. Confirm or escalate to CSFLE.

---

**Q3 — Password hashing library (blocks Phase 6)**
The old project used bcrypt. Options:
- `bcrypt` (node-gyp native, reliable, well-understood)
- `argon2` (stronger by default, also native)
- `@node-rs/bcrypt` (WASM-based, no native compile, Edge-compatible)

Decision needed: confirm `bcrypt` or choose alternative.

---

**Q4 — Rate-limiting implementation (blocks Phase 10)**
The analysis flags that only auth routes were rate-limited previously. Options:
- `next-rate-limit` package
- Custom in-memory sliding window in `src/middleware.ts`
- Upstash Redis-backed rate limit (requires Redis infra)

Decision needed: in-memory is acceptable for a single-process deployment; Redis is required for multi-instance. Confirm deployment topology.

---

**Q5 — Whether to use an ORM or raw MongoDB driver (blocks Phase 4)**
The old project used the raw MongoDB Node.js driver directly. Options:
- **Raw driver** (current): maximum flexibility, no abstraction overhead, matches existing code.
- **Mongoose**: schema validation, middleware hooks, but adds ODM complexity.
- **Prisma with MongoDB connector**: type-safe, but Prisma's Mongo support is less mature than its SQL support.

Decision needed: raw driver is assumed in this plan (consistent with old project). Confirm.

---

**Q6 — Alert evaluation trigger (blocks Phase 6)**
Two approaches to running alert evaluation:
- **Inside `AprSyncJob.run()`**: after each sync, call `AlertService.evaluate()` directly. Simple, no extra cron. Alerts fire at most once per sync cycle.
- **Separate cron endpoint `/api/cron/evaluate-alerts`**: decoupled, but requires a second cron job and a public HTTP surface (same `X-Cron-Secret` pattern).

Decision needed: embedded evaluation inside sync job is assumed in this plan. Confirm.

---

**Q7 — Session token format and length (blocks Phase 3)**
- Assumed: 32-byte cryptographically random token (`crypto.getRandomValues`), hex-encoded (64 chars), stored as `SHA-256(token)` in DB, raw token in the httpOnly cookie.
- Expiry: 7 days rolling, or 7 days absolute?

Decision needed: confirm rolling vs absolute expiry.

---

**Q8 — Test database (blocks Phase 2)**
Integration tests require a MongoDB instance. Options:
- **Same Docker instance, dedicated test database** (`apr_hunter_test`): simplest, no extra infra.
- **`mongodb-memory-server`**: in-process, no Docker dependency, but does not replicate TLS setup.

Decision needed: test DB URI in `.env.test` pointing to the same Docker instance is assumed. Confirm.
