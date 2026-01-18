# Web3 Position Detection - UI Integration Plan

## Phase Overview
Integrate server-side Web3 position detection (Yearn, Aave, ERC20, Lido) into the dashboard UI with priority order.

---

## Priority Order
1. **Yearn** (highest priority)
2. **Aave**
3. **ERC20** (generic token balance)
4. **Lido** (lowest priority)

---

## Architecture Overview

```
Dashboard
├── Portfolio View
│   ├── Web2 Positions (Manual Entry)
│   └── Web3 Positions (Auto-Detected)
│       ├── Yearn Vaults
│       ├── Aave Supplies
│       ├── ERC20 Tokens
│       └── Lido stETH
│
├── Auto-Detect Modal
│   └── Scan Wallet → Show Results → Import to Portfolio
│
└── Settings
    └── Configure Chains & Addresses
```

---

## Implementation Steps

### Phase 1: Create API Client Hook
**File:** `src/lib/hooks/useWeb3PositionDetection.ts`

```typescript
// Hook for detecting Web3 positions
export function useWeb3PositionDetection(
  walletAddress?: string,
  chainIds?: number[],
  enabled?: boolean
) {
  // Uses React Query to call POST /api/web3/detect-positions
  // Returns: { positions, loading, error, refetch }
}
```

### Phase 2: Create UI Components

#### 2.1 Web3 Position Scanner Modal
**File:** `src/components/Web3PositionScanner.tsx`
- Input: wallet address, select chains
- Shows scanning progress
- Displays detected positions with:
  - Protocol icon (Yearn/Aave/Lido)
  - Asset name & amount
  - Current APR
  - Chain name
  - Import button

#### 2.2 Web3 Positions Display Component
**File:** `src/components/Web3PositionsList.tsx`
- Tabbed view: Yearn | Aave | ERC20 | Lido
- Table showing:
  - Asset symbol
  - Amount held
  - Current value (USD)
  - APR
  - Chain
  - Last updated
  - "Add to Portfolio" button

#### 2.3 Import Dialog
**File:** `src/components/ImportWeb3PositionDialog.tsx`
- Confirm import details
- Select which portfolio to import to
- Auto-fill position fields from detected data
- Create position on confirmation

### Phase 3: Update Dashboard Pages

#### 3.1 Dashboard Home (`/dashboard`)
- Add "Web3 Wallet Scanner" card/button
- Show summary of Web3 positions
- Quick links to import positions

#### 3.2 Portfolios Page (`/dashboard/portfolios`)
- Add "Scan Web3 Wallet" button in portfolio detail
- Show Web3 positions under "Web3 Positions" tab
- Separate from manual Web2 positions

#### 3.3 Portfolios Detail (`/dashboard/portfolios/[id]`)
- Add Web3 positions tab
- Show detected positions for that portfolio's wallet
- "Refresh" button to re-scan
- Import selected positions into portfolio

#### 3.4 Settings (`/dashboard/settings`)
- Add "Web3 Settings" section
- Choose default chains to scan
- Configure connected wallet address
- Manage chain preferences

### Phase 4: Update Models & Types

**File:** `src/types/web3.ts` (NEW)
```typescript
export interface DetectedWeb3Position {
  symbol: string;
  asset: string;
  platform: 'Yearn' | 'Aave' | 'Lido' | string;
  amount: number;
  apr: number;
  chain: string;
  detectionType: 'yearn' | 'aave' | 'erc20' | 'lido';
  lastUpdated: string;
}

export interface Web3DetectionResult {
  positions: DetectedWeb3Position[];
  walletAddress: string;
  chainIds: number[];
  detectedCount: number;
  lastScanned: string;
}
```

---

## Component Dependency Tree

```
DashboardLayout
├── Header (existing)
└── MainContent
    ├── DashboardPage
    │   ├── Web3ScannerCard (NEW)
    │   └── Web3PositionsSummary (NEW)
    │
    ├── PortfoliosPage
    │   ├── PortfolioCard (existing)
    │   └── Web3ScanButton (NEW)
    │
    ├── PortfolioDetailPage
    │   ├── Web3PositionsTab (NEW)
    │   ├── Web3PositionsList (NEW)
    │   └── ImportWeb3PositionDialog (NEW)
    │
    ├── SettingsPage
    │   ├── ExchangeKeysSettings (existing)
    │   └── Web3Settings (NEW)
    │
    └── Web3PositionScanner
        ├── WalletInput (NEW)
        ├── ChainSelector (NEW)
        ├── ScanProgress (NEW)
        ├── PositionsList (NEW)
        └── ImportWeb3PositionDialog (NEW)
```

---

## File Structure (New Files to Create)

```
src/
├── components/
│   ├── Web3PositionScanner.tsx         (400 lines)
│   ├── Web3PositionsList.tsx           (300 lines)
│   ├── Web3PositionCard.tsx            (150 lines)
│   ├── ImportWeb3PositionDialog.tsx    (250 lines)
│   ├── Web3Settings.tsx                (200 lines)
│   └── Web3ScannerCard.tsx             (200 lines)
│
├── lib/
│   ├── hooks/
│   │   ├── useWeb3PositionDetection.ts (150 lines)
│   │   └── useWeb3Chains.ts            (100 lines)
│   │
│   └── web3/
│       └── constants.ts                (100 lines)
│
├── types/
│   └── web3.ts                         (80 lines)
│
└── app/
    └── dashboard/
        └── settings/
            └── [sections updated with Web3 tab]
```

---

## API Calls Flow

```
User clicks "Scan Web3 Wallet"
    ↓
Show modal with wallet input & chain selector
    ↓
User confirms (clicks "Scan")
    ↓
Call: POST /api/web3/detect-positions
{
  "walletAddress": "0x...",
  "chainIds": [1, 137, 35935]
}
    ↓
Display results:
- Yearn positions (priority 1)
- Aave positions (priority 2)
- ERC20 positions (priority 3)
- Lido positions (priority 4)
    ↓
User selects positions to import
    ↓
Call: POST /api/positions (for each selected)
    ↓
Position created in portfolio
    ↓
Show confirmation
```

---

## State Management

**Using React Query (already in stack):**
- `useWeb3PositionDetection()` - Cache detected positions
- `useImportWeb3Position()` - Import mutation
- `useWeb3Settings()` - User's Web3 preferences

---

## UI/UX Considerations

### 1. Loading States
- Skeleton loaders while detecting positions
- Progress indicator showing chain scan status
- "Scanning chain 1/3..." message

### 2. Error Handling
- "RPC connection failed for chain X"
- Retry button for individual chains
- Graceful fallback if some chains fail

### 3. Empty States
- "No Web3 positions detected"
- Show supported protocols & chains
- Link to create positions manually

### 4. Performance
- Debounce wallet input (300ms)
- Cache detection results (5 min)
- Lazy load images for protocol logos
- Batch imports (don't create 1 API call per position)

### 5. Mobile Responsiveness
- Stack tables vertically on mobile
- Touch-friendly buttons (48px min height)
- Modal scales to viewport

---

## Styling (Tailwind)

Colors consistent with existing dashboard:
- Dark theme: bg-gray-900, text-white
- Accent: emerald-600 (existing)
- Protocol badges:
  - Yearn: purple-600
  - Aave: blue-600
  - ERC20: gray-600
  - Lido: orange-600

---

## Testing Plan

- [ ] Unit: `useWeb3PositionDetection()` with mocked API
- [ ] Integration: Detect positions on Sepolia testnet
- [ ] E2E: Scan wallet → Import → Verify position saved
- [ ] Multi-chain: Scan Ethereum + Polygon + TractSafe
- [ ] Error scenarios: Invalid address, RPC failure, no positions

---

## Implementation Order

1. **Create API client hook** (easy, foundational)
2. **Create base components** (Web3PositionCard, Web3PositionsList)
3. **Create scanner modal** (main feature)
4. **Integrate into dashboard** (easy, mostly copy-paste)
5. **Add import dialog** (integrates with existing portfolio logic)
6. **Settings integration** (polish)

---

## Estimated Effort

| Task | Effort | Time |
|------|--------|------|
| API Hook | S | 30 min |
| Base Components | M | 1.5 hrs |
| Scanner Modal | M | 2 hrs |
| Dashboard Integration | S | 1 hr |
| Import Dialog | S | 1 hr |
| Settings | S | 45 min |
| Testing & Polish | M | 1 hr |
| **Total** | - | **7.5 hrs** |

---

## Rollout Strategy

### Phase 1 (MVP)
- Basic scanner in dashboard
- Shows detected positions
- Manual import button
- Works on Ethereum mainnet only

### Phase 2 (Polish)
- Multi-chain support
- Settings page
- Auto-refresh
- Better error handling

### Phase 3 (Advanced)
- One-click import all
- Scheduled auto-detection
- Yield optimization suggestions

---

## Success Metrics

✅ User can detect Web3 positions in < 10 seconds
✅ Works on Ethereum + Polygon + TractSafe
✅ Can import detected position into portfolio in < 3 clicks
✅ No errors/crashes in happy path
✅ Mobile responsive

---

**Ready to implement?** Review this plan and let me know:
1. Any changes to priorities?
2. Any components to add/remove?
3. Should we start with Phase 1 MVP or go full featured?
