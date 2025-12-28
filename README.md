## APR Hunter 2.0 – Single-stack Info Hub

APR Hunter 2.0 is the consolidated (one-folder) Next.js application that lazy crypto investors use to scout staking/APR opportunities across Binance, OKX, KuCoin today and Kraken/Aave/Yearn tomorrow.  
Phase 1 mirrors the UI from `../apr-hunter/frontend` but connects to a brand-new backend built directly inside this Next.js app (App Router + API routes). See `PROJECT_OVERVIEW.md` for the long-form strategy brief.

### Stack

- Next.js 16 (App Router) + React Server Components
- pnpm (workspace default) for all scripts
- Tailwind CSS 3 + custom gradient/glass UI
- React Query for client data fetching + background refresh
- Remote MongoDB (or Atlas) for APR snapshots/cache
- Exchange connectors (Binance live signer, OKX/KuCoin/Kraken/Aave/Yearn placeholders) with fallback sample data

---

## Getting Started

```bash
pnpm install
pnpm dev
# visit http://localhost:3000
```

The UI auto-refreshes every 30 s by calling local API routes:

- `GET /api/apr` – full aggregation
- `GET /api/apr/top?limit=10` – leaderboard
- `GET /api/apr/assets` – asset selector
- `GET /api/apr/asset/[symbol]` – comparison table

---

## Production (PM2)

The repo ships with an `ecosystem.config.cjs` that runs `next start` directly through PM2, which avoids the previous `bash` recursion error. Always build the app before handing control to PM2 so `.next` exists:

```bash
pnpm install
pnpm run pm2:start         # runs pnpm build && pm2 start ecosystem.config.cjs --only apr-hunter
# or manually:
pnpm build
pm2 delete apr-hunter || true
pm2 start ecosystem.config.cjs --only apr-hunter
pm2 logs apr-hunter
```

- `pm2 restart apr-hunter` keeps the same process name and can be paired with another `pnpm build`.
- The build script forces Webpack (`next build --webpack`) because Turbopack fails when it touches the checked-in MongoDB dataset.
- The process uses the production Next.js server (`next start`), so no separate Node adapter is required.

---

## Environment Variables

Create a `.env.local` file in the repo root:

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=apr-hunter
BINANCE_API_KEY=...
BINANCE_API_SECRET=...
OKX_API_KEY=...
OKX_API_SECRET=...
OKX_PASSPHRASE=...
KUCOIN_API_KEY=...
KUCOIN_API_SECRET=...
KUCOIN_PASSPHRASE=...
ENABLE_LIVE_EXCHANGE_FETCH=true
```

- If `ENABLE_LIVE_EXCHANGE_FETCH` is anything other than `true`, the API will serve curated sample data so the UI never breaks.
- Remote MongoDB is optional but recommended; when configured we persist every fetch to `apr_snapshots` for historical queries and throttling protection.

---

## Project Structure

```
src/
 ├─ app/
 │   ├─ api/apr/...    ← API routes (aggregation, top list, per-asset data)
 │   ├─ layout.tsx     ← Global providers + fonts
 │   └─ page.tsx       ← Landing page that mirrors the original UI brief
 ├─ components/        ← Header + data visualizations (TopOpportunities, AprComparison)
 ├─ lib/
 │   ├─ data/          ← Sample APR fixtures for offline/demo mode
 │   ├─ db/            ← Mongo helpers + APR repositories
 │   ├─ exchanges/     ← Registry + connectors (Binance live signer + placeholders)
 │   ├─ env.ts         ← Zod-parsed environment config
 │   └─ http/          ← Fetch helpers for the client
 └─ types/             ← Shared APR types
```

---

## Roadmap Alignment

- **Phase 1 (current):** Info-only dashboard that fetches APR via CEX API keys, merges data, and shows the best lazy-investor opportunities.
- **Phase 2:** Add portfolio storage + alerting powered by Mongo, gated features, and wallet connects.
- **Phase 3:** Introduce audited smart contracts + Yearn strategies so users can deposit/withdraw directly from the UI.

Everything above mirrors the original README vision while keeping a single Next.js folder so deployment stays simple.
