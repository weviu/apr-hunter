# Phase 2.5: User-Provided Exchange API Keys

## Overview

This phase implements secure storage and management of user-provided exchange API keys. Instead of using shared application API keys (which exposed all users' holdings to each other), users can now securely add their own exchange credentials and import their actual holdings.

## Architecture

### Components

1. **API Endpoint: `/api/settings/exchange-keys`** (POST/GET/DELETE)
   - Store encrypted API keys in MongoDB under `users.exchangeKeys[exchange]`
   - Keys encrypted with AES-256-CBC before storage
   - Decrypted on-demand when fetching holdings
   - Returns only metadata (configured status, last updated), never actual keys

2. **Helper Function: `getUserExchangeKeys(userId, exchange, db)`**
   - Retrieves and decrypts user's keys from MongoDB
   - Returns `{ apiKey, apiSecret, passphrase }`
   - Returns `null` if user hasn't configured that exchange

3. **React Hooks: `src/lib/hooks/useExchangeKeys.ts`**
   - `useExchangeKeysMetadata()` - Query metadata about configured exchanges
   - `useSaveExchangeKeys()` - Mutation to add/update exchange keys
   - `useRemoveExchangeKeys()` - Mutation to delete exchange keys

4. **UI Component: `src/components/ExchangeKeysSettings.tsx`**
   - Expandable form for each exchange (OKX, KuCoin, Binance)
   - Input fields for API Key, API Secret, Passphrase
   - Shows connection status and last updated time
   - Save/Remove buttons with loading states
   - Validation for required fields

5. **CexAdapter Classes: `src/lib/exchanges/cex-adapter.ts`**
   - Updated to accept credentials as parameters: `fetchHoldings(apiKey, apiSecret, passphrase?)`
   - Removed hardcoded env variable reads
   - BinanceAdapter, OkxAdapter, KuCoinAdapter all refactored
   - Works with both parameterized credentials and environment variables (fallback)

### API Endpoints

#### GET `/api/settings/exchange-keys`
Returns metadata about user's configured exchanges (no credentials).

**Response:**
```json
{
  "success": true,
  "data": {
    "OKX": {
      "configured": true,
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    "Binance": {
      "configured": false,
      "lastUpdated": null
    }
  }
}
```

#### POST `/api/settings/exchange-keys`
Store or update encrypted API keys.

**Request:**
```json
{
  "exchange": "OKX",
  "apiKey": "user's api key",
  "apiSecret": "user's api secret",
  "passphrase": "user's passphrase (optional, required for OKX/KuCoin)"
}
```

#### DELETE `/api/settings/exchange-keys?exchange=OKX`
Delete stored API keys for an exchange.

#### GET `/api/exchanges/holdings?exchange=OKX`
Fetch user's holdings using their stored API keys.

**Returns:**
```json
{
  "success": true,
  "data": {
    "exchange": "OKX",
    "holdings": [
      {
        "symbol": "BTC",
        "asset": "BTC",
        "amount": 0.5,
        "platform": "OKX",
        "platformType": "exchange"
      }
    ]
  }
}
```

## Data Flow

### Adding Exchange API Keys

1. User navigates to Settings → Exchange API Keys
2. Clicks "Add" for their preferred exchange
3. Enters API Key, API Secret, and Passphrase (if required)
4. Clicks "Save"
5. Form validates required fields on client-side
6. Calls `POST /api/settings/exchange-keys`
7. Server encrypts keys with AES-256-CBC
8. Keys stored in `users.exchangeKeys[exchange]`
9. UI updates to show "Configured" status
10. Form clears and collapses

### Importing Holdings

1. User clicks "Import from Exchange" on dashboard
2. Selects exchange from dropdown (only shows configured exchanges)
3. Frontend calls `GET /api/exchanges/holdings?exchange=OKX`
4. Server:
   - Gets user's session token
   - Retrieves encrypted keys from MongoDB
   - Decrypts keys using `decryptKey()`
   - Calls adapter with `fetchHoldings(apiKey, apiSecret, passphrase)`
   - Adapter makes authenticated request to exchange API
   - Returns holdings data
5. Frontend populates position form with real balances

### Security

- **Encryption**: AES-256-CBC with ENCRYPTION_KEY (set in env)
- **At-Rest**: Keys stored encrypted in MongoDB
- **In-Transit**: Sent over HTTPS only
- **Decryption**: Only decrypted when needed (on-demand)
- **Logging**: Keys never logged or exposed in error messages
- **UI**: Form fields clear after successful save

## Supported Exchanges

### OKX
- **API Key**: Account Dashboard → API Settings
- **API Secret**: Shown once during generation
- **Passphrase**: User-defined during API key creation (required)
- **Permissions Needed**: Read-only access to account balance

### KuCoin
- **API Key**: Account → API Management
- **API Secret**: Shown once during generation
- **Passphrase**: User-defined during API key creation (required)
- **Permissions Needed**: General read access

### Binance
- **API Key**: Account → API Management → Create API Key
- **API Secret**: Shown once during generation
- **Passphrase**: Not required
- **Permissions Needed**: Read account data

## Integration Points

### Settings Page
Need to integrate `ExchangeKeysSettings` component into dashboard settings page:

```tsx
import { ExchangeKeysSettings } from '@/components/ExchangeKeysSettings';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <ExchangeKeysSettings />
      {/* Other settings sections */}
    </div>
  );
}
```

### Import Flow
Update "Import from Exchange" modal to:
1. Show only exchanges user has configured
2. If none configured: "Go to Settings to add your exchange API keys"
3. Link to settings page

## Environment Variables

```env
ENCRYPTION_KEY=your-secret-encryption-key-change-in-production
```

This should be a strong, random string. In development, falls back to `apr-hunter-default-key-change-in-production`.

## Testing

### Test User Adding OKX Keys
1. Visit Settings → Exchange API Keys
2. Expand OKX section
3. Enter test API credentials:
   - API Key: (from your OKX account)
   - API Secret: (from your OKX account)
   - Passphrase: (from your OKX account)
4. Click "Save"
5. Verify status shows "Configured"

### Test Holdings Import
1. In dashboard, click "Import from Exchange"
2. Select "OKX"
3. System fetches real holdings from OKX
4. Verify balances are correct
5. Can see positions like "BTC: 0.5"

## Status

✅ **Complete** - Ready to integrate Settings page and test with real user keys

### Completed:
- API endpoints for key CRUD operations
- React Query hooks for key management
- Settings UI component
- CexAdapter classes updated to accept credentials
- Encryption/decryption functions
- MongoDB schema design

### Pending:
- Integrate ExchangeKeysSettings into `/dashboard/settings` page
- Test with real OKX API keys
- Update ImportFromExchange modal to check for configured keys
- (Optional) Add support for Binance/KuCoin in future

## Notes

- Keys are encrypted at rest in MongoDB
- Each user's keys are isolated (encrypted separately)
- If ENCRYPTION_KEY changes, existing keys become unreadable (plan for rotation)
- For production: Use strong, unique ENCRYPTION_KEY and rotate periodically
- Consider moving to crypto-js for better key derivation in future

