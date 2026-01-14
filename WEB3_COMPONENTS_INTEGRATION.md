# Phase 2 UI Components - Integration Guide

## Components Created

All 4 Phase 2 components are now ready for integration:

### 1. Web3PositionCard.tsx (2.9K)
**Purpose:** Display individual detected Web3 position  
**Props:**
```typescript
interface Web3PositionCardProps {
  position: DetectedWeb3Position;
  onImport?: (position: DetectedWeb3Position) => void;
  isLoading?: boolean;
}
```
**Features:**
- Shows symbol, amount, APR, chain, platform
- Format helpers for large numbers (M, K notation)
- Protocol color indicator
- Import button with loading state
- No emojis

---

### 2. Web3PositionsList.tsx (3.5K)
**Purpose:** Display multiple positions grouped by protocol (collapsible, Option C)  
**Props:**
```typescript
interface Web3PositionsListProps {
  groups: ProtocolPositionsGroup[];
  onImport?: (position: DetectedWeb3Position) => void;
  isLoading?: boolean;
  lastScanned?: string;
}
```
**Features:**
- Groups by protocol (Yearn → Aave → ERC20) in priority order
- Expand/collapse toggle per protocol
- Per-protocol totals (TVL + average APR)
- Composes Web3PositionCard for each position
- Last scanned timestamp
- Dark theme (gray-900 bg)

**Usage:**
```typescript
import { Web3PositionsList } from '@/components/Web3PositionsList';
import { groupPositionsByProtocol } from '@/types/web3';

const groupedPositions = groupPositionsByProtocol(positions);
<Web3PositionsList 
  groups={groupedPositions}
  onImport={handleImport}
  lastScanned={new Date().toISOString()}
/>
```

---

### 3. Web3PositionScanner.tsx (6.9K)
**Purpose:** Modal to scan wallet for positions across chains  
**Props:**
```typescript
interface Web3PositionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionsDetected?: (count: number) => void;
}
```
**Features:**
- Wallet address input with validation
- Multi-chain selector (checkboxes, shows count)
- "Scan Now" → "Refresh" button UI
- Uses useWeb3PositionDetection() hook
- Displays results with Web3PositionsList
- Auto-refresh enabled after scan (5-min interval)
- Manual refresh on-demand
- Loading state with spinner
- Modal layout with close button

**Usage:**
```typescript
import { Web3PositionScanner } from '@/components/Web3PositionScanner';
import { useState } from 'react';

export function DashboardPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setScannerOpen(true)}>
        Scan Web3 Positions
      </button>
      <Web3PositionScanner 
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onPositionsDetected={(count) => console.log(`${count} positions found`)}
      />
    </>
  );
}
```

---

### 4. ImportWeb3PositionDialog.tsx (5.4K)
**Purpose:** Confirm import of detected position to portfolio  
**Props:**
```typescript
interface ImportWeb3PositionDialogProps {
  isOpen: boolean;
  position: DetectedWeb3Position | null;
  portfolios: Portfolio[];
  onImport: (positionId: string, portfolioId: string) => Promise<void>;
  onClose: () => void;
}
```
**Features:**
- Shows position details (symbol, amount, APR, chain, platform)
- Portfolio dropdown selector
- "Import Position" button with loading/success states
- Success confirmation with checkmark
- Empty state if no portfolios
- Modal layout

**Usage:**
```typescript
import { ImportWeb3PositionDialog } from '@/components/ImportWeb3PositionDialog';

<ImportWeb3PositionDialog
  isOpen={showImport}
  position={selectedPosition}
  portfolios={userPortfolios}
  onImport={async (posId, portId) => {
    // Call API to import position
    await fetch('/api/web3/import', {
      method: 'POST',
      body: JSON.stringify({ positionId: posId, portfolioId: portId })
    });
  }}
  onClose={() => setShowImport(false)}
/>
```

---

## Integration Locations

### 1. Dashboard Home Page
**File:** `/src/app/dashboard/page.tsx`

Add Web3 scanner card:
```typescript
'use client';
import { Web3PositionScanner } from '@/components/Web3PositionScanner';
import { useState } from 'react';

export default function DashboardPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  
  return (
    <div>
      {/* Existing dashboard content */}
      
      {/* Add Web3 section */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Web3 Positions</h2>
        <button
          onClick={() => setScannerOpen(true)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
        >
          Scan Web3 Positions
        </button>
      </section>
      
      <Web3PositionScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
```

---

### 2. Portfolio Details Page
**File:** `/src/app/dashboard/portfolios/[id]/page.tsx`

Add Web3 positions tab:
```typescript
'use client';
import { Web3PositionsList } from '@/components/Web3PositionsList';
import { useWeb3PositionDetection } from '@/lib/hooks/useWeb3PositionDetection';
import { groupPositionsByProtocol } from '@/types/web3';
import { useState } from 'react';

export default function PortfolioPage({ params }) {
  const [activeTab, setActiveTab] = useState('holdings'); // or 'web3'
  const { data: positions } = useWeb3PositionDetection({
    walletAddress: portfolio?.walletAddress, // Get from portfolio
    chainIds: [1, 137, 42161, 10], // Configured chains
  });
  
  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`px-4 py-2 border-b-2 transition ${
            activeTab === 'holdings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          Holdings
        </button>
        <button
          onClick={() => setActiveTab('web3')}
          className={`px-4 py-2 border-b-2 transition ${
            activeTab === 'web3'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          Web3 Positions
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'holdings' && (
        // Existing holdings tab
      )}
      
      {activeTab === 'web3' && positions && (
        <Web3PositionsList
          groups={groupPositionsByProtocol(positions)}
          lastScanned={new Date().toISOString()}
        />
      )}
    </div>
  );
}
```

---

### 3. Settings Page
**File:** `/src/app/dashboard/settings/page.tsx`

Add Web3 chain preferences:
```typescript
'use client';
import { useWeb3Chains } from '@/lib/hooks/useWeb3Chains';

export default function SettingsPage() {
  const { 
    selectedChains, 
    availableChains, 
    toggleChain, 
    resetToDefaults 
  } = useWeb3Chains();
  
  return (
    <div>
      {/* Existing settings */}
      
      <div className="mt-8 border-t border-gray-700 pt-8">
        <h3 className="text-xl font-bold text-white mb-4">Web3 Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Chains to Monitor
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => toggleChain(chain.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                  selectedChains.some(c => c.id === chain.id)
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
          
          <button
            onClick={resetToDefaults}
            className="mt-4 text-sm text-gray-400 hover:text-gray-300 underline"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Hook Dependencies

All components depend on these hooks (already created in Phase 1):

### useWeb3PositionDetection()
```typescript
const { 
  data: positions,
  isPending,
  mutate: detectPositions
} = useWeb3PositionDetection();
```

### useWeb3Chains()
```typescript
const { 
  selectedChainIds,
  selectedChains,
  availableChains,
  toggleChain,
  selectChains,
  resetToDefaults
} = useWeb3Chains();
```

### useAutoRefreshPositions()
Used automatically in Web3PositionScanner to enable 5-min periodic refresh

---

## Auto-Import Behavior

Per user requirements: **Auto-import is enabled** (no confirmation dialogs)

Current scanner component logs imported positions:
```typescript
onImport={(position) => {
  console.log('Auto-importing position:', position);
}}
```

Replace with actual import logic once API endpoint is implemented:
```typescript
const handleAutoImport = async (position: DetectedWeb3Position) => {
  try {
    const response = await fetch('/api/portfolio/import-web3-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        position,
        portfolioId: portfolio?.id, // Auto-select first portfolio or user-selected
      }),
    });
    
    if (!response.ok) throw new Error('Import failed');
    
    // Refresh portfolio data
    revalidatePortfolios();
  } catch (error) {
    console.error('Auto-import failed:', error);
    // Fall back to ImportWeb3PositionDialog
    setShowImportDialog(true);
  }
};
```

---

## Refresh Behavior

Both manual and periodic refresh enabled per requirements:

1. **Manual Refresh:** "Refresh" button in Web3PositionScanner (after first scan)
2. **Auto Refresh:** 5-minute interval via useAutoRefreshPositions() hook
3. **Manual Button:** Explicit trigger via useManualRefreshPositions() hook

All refresh operations call POST `/api/web3/detect-positions` with same parameters

---

## Next Steps

1. **Test Components in Isolation**
   - Storybook or isolated pages to verify component props/states
   
2. **Implement API Endpoints**
   - `/api/portfolio/import-web3-position` - Store detected position
   - Add import logic to position scanning flow

3. **Integrate into Dashboard Pages**
   - Add Web3PositionScanner to dashboard home
   - Add Web3PositionsList tab to portfolio details
   - Add Web3 settings to settings page

4. **Add Real Wallet Testing**
   - Connect wagmi wallet selector
   - Test with real wallets on Sepolia testnet
   - Verify position detection across chains

5. **Error Handling & Edge Cases**
   - Handle invalid wallet addresses
   - Handle network failures
   - Retry logic for failed scans
   - Empty state messages

---

## Component Architecture Summary

```
Web3PositionScanner (Modal)
  ├─ Wallet address input
  ├─ Chain selector
  ├─ Scan/Refresh button
  └─ Web3PositionsList (Results)
      └─ ProtocolGroup (Collapsible)
          └─ Web3PositionCard (Per position)
              └─ Import button
                  └─ ImportWeb3PositionDialog (Modal)

useWeb3PositionDetection (Hook)
  └─ POST /api/web3/detect-positions

useWeb3Chains (Hook)
  └─ localStorage persistence

useAutoRefreshPositions (Hook)
  └─ 5-min interval polling
```

All components styled with Tailwind CSS (dark theme), no emojis, emerald accents (consistent with existing design).
