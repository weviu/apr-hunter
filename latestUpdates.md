# Latest Updates

_Working log of the recent overhaul. Most recent first._

## 2026-06-28

### MongoDB migrated into its own repo (TLS)
- Mongo now runs from `/home/san/mongodb` (route07/mongodb setup) instead of the wiped legacy
  `/home/san/apr-hunter/mongodb` path. Enabled TLS in that repo's docker-compose (the committed one
  shipped without TLS flags despite the docs), generated self-signed certs, reused the existing app
  credentials, and pointed the app's `MONGODB_URI` at `/home/san/mongodb/tls-certs/ca.crt`.
- Old data did not carry over (legacy data dir was already empty) — fresh DB.
- mongo-admin UI runs on :3003 (app owns :3000) and still needs TLS client config to connect.

### Phase 4 — Aave V3 wallet auto-detect (manual + auto)
- Real on-chain supply APR: reads Aave `getReserveData` (`liquidityRate` ray → decimal) instead of
  the previous hardcoded 3.5%.
- `POST /api/web3/scan-aave` — server-side scan of a wallet's Aave V3 supply on Sepolia via the
  configured RPC (`RPC_URL_SEPOLIA`), with a `DEMO_WALLET_ADDRESS` fallback so the demo always shows
  something. Graceful empty/error states.
- Import path: detected positions saved via `POST /api/positions` (extended to accept an on-chain
  `apr` + DeFi fields), tagged `product: "Lending (Aave V3)"`, rendered identically to manual ones.
- My Positions: Connect Wallet → Scan → detected list with per-item Import (live APR + USD).
- Fixed the WalletConnect env var name to match `.env` (`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`).
- Remaining (user side): seed a Sepolia Aave V3 supply + set `DEMO_WALLET_ADDRESS` to demo the
  end-to-end auto-detect.

### "My Positions" rebuild (replaced portfolios)
The portfolio-folder concept was replaced by a single, live **My Positions** view.

- Positions store only `{asset, platform, product, amount}`; USD value (`amount × live price`) and
  APR (live join to `apr_snapshots`) are computed at display time, so both track the market.
- Backend: `product` field on positions; `GET /api/apr/products`, `GET /api/prices`,
  `POST /api/positions` (default hidden portfolio), enriched `GET /api/positions` (currentApr +
  freshness), `DELETE /api/positions/[id]`. Sync job warms the price cache.
- UI: `/dashboard` = summary (Total Value, Est. Monthly Earnings, count) + position cards + Add
  Position modal (asset → platform → product, live rate readout). Header nav updated.
- Removed dead portfolio UI (pages, PortfolioCard/Form, old Position table/form/history); portfolio
  backend kept as the hidden default container.

### UI redesign — "dark Notion"
- Token system (canvas/surface/hairline/fg/accent/success/danger) as RGB-channel CSS vars so
  Tailwind opacity modifiers work; deep-blue accent (`--accent-deep`) for soft panels.
- Framer Motion primitives in `src/components/ui`: `FadeRise`, `Stagger`/`StaggerItem`, `Modal`,
  `Button` (≥400ms loading weight), `Card`, `Skeleton` — reduced-motion aware, no springs.
- Reskinned: Header, landing (+ TopOpportunities/AprComparison), dashboard, alerts, notifications,
  settings, login/register. Inter font (was Sora).

### Fixes
- **Auth cookie not persisting** — session cookie was `Secure` under `NODE_ENV=production`, dropped
  over plain `http://<server>`. Now tied to `NEXT_PUBLIC_APP_URL` scheme.
- **Signup didn't log you in** — `register` now opens a session + sets the cookie.
- **Token opacity bug** — colors stored as RGB channels so `/opacity` modifiers render correctly
  (was producing white borders).
- **Navbar flicker** — `WalletConnect` reserves a stable min-width while RainbowKit initialises.
- Register password min aligned to 8; `vitest` no longer scans vendored bcrypt tests in `.next/`.

### Infrastructure
- Single PM2 process (`apr-hunter`); APR sync runs in-process via `src/instrumentation.ts`
  (15-min interval) instead of a separate cron process.
