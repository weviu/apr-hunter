# Integration Checklist: User API Keys System

## Quick Start

The user-provided API keys system is fully implemented. Here's how to integrate it into your dashboard:

## Step 1: Add Settings Page

Create or update `/src/app/dashboard/settings/page.tsx`:

```tsx
'use client';

import { ExchangeKeysSettings } from '@/components/ExchangeKeysSettings';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Dashboard Settings</h1>
        
        <div className="space-y-12">
          {/* Exchange API Keys Configuration */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <ExchangeKeysSettings />
          </div>
          
          {/* Add other settings sections here in future */}
        </div>
      </div>
    </div>
  );
}
```

## Step 2: Add Settings Link to Dashboard Header

Update your dashboard header/navigation to include a link to `/dashboard/settings`:

```tsx
<a href="/dashboard/settings" className="px-4 py-2 rounded-lg hover:bg-slate-700">
  ⚙️ Settings
</a>
```

## Step 3: Update Import from Exchange Modal

Modify your "Import from Exchange" modal to:

1. Check which exchanges user has configured
2. Only show those in the dropdown
3. If none configured, show a message with link to settings

Example logic:
```tsx
const { data: metadata } = useExchangeKeysMetadata();
const configuredExchanges = Object.entries(metadata || {})
  .filter(([_, config]) => config.configured)
  .map(([name]) => name);

if (configuredExchanges.length === 0) {
  return (
    <div>
      <p>No exchanges configured yet.</p>
      <a href="/dashboard/settings">Go to Settings to add your exchange API keys</a>
    </div>
  );
}
```

## Step 4: Test the Flow

### First Time Setup
1. User logs in
2. Goes to Settings → Exchange API Keys
3. Expands OKX (or other exchange)
4. Enters their API Key, Secret, and Passphrase from their exchange account
5. Clicks Save
6. System encrypts and stores the keys

### Import Holdings
1. User goes to Import from Exchange modal
2. Selects their configured exchange
3. System fetches their real holdings
4. Auto-fills position form with correct balances

## What's Already Built

### Backend Files
- ✅ `/src/app/api/settings/exchange-keys/route.ts` - Key storage/retrieval API
- ✅ `/src/app/api/exchanges/holdings/route.ts` - Fetch holdings with user keys
- ✅ `/src/app/api/exchanges/route.ts` - Also supports user keys
- ✅ `/src/lib/exchanges/cex-adapter.ts` - Adapters updated for parameterized keys
- ✅ `/src/app/api/settings/exchange-keys/route.ts` exports `getUserExchangeKeys()` helper

### Frontend Files
- ✅ `/src/lib/hooks/useExchangeKeys.ts` - React Query hooks
- ✅ `/src/components/ExchangeKeysSettings.tsx` - Settings UI component

### Key Functions Available

#### In React Components
```typescript
import { useExchangeKeysMetadata, useSaveExchangeKeys, useRemoveExchangeKeys } from '@/lib/hooks/useExchangeKeys';

// Check which exchanges are configured
const { data: metadata } = useExchangeKeysMetadata();

// Save new keys
const saveKeys = useSaveExchangeKeys();
saveKeys.mutate({
  exchange: 'OKX',
  apiKey: '...',
  apiSecret: '...',
  passphrase: '...'
});

// Remove keys
const removeKeys = useRemoveExchangeKeys();
removeKeys.mutate('OKX');
```

#### In API Routes
```typescript
import { getUserExchangeKeys } from '@/app/api/settings/exchange-keys/route';

// Retrieve user's decrypted keys
const keys = await getUserExchangeKeys(userId, 'OKX', db);
if (keys) {
  const holdings = await adapter.fetchHoldings(keys.apiKey, keys.apiSecret, keys.passphrase);
}
```

## Environment Setup

Add to your `.env.local`:
```env
ENCRYPTION_KEY=your-strong-secret-key-here
```

If not set, uses default (insecure) key. **CHANGE THIS IN PRODUCTION**.

## Security Checklist

- ✅ Keys encrypted at rest (AES-256-CBC)
- ✅ Keys decrypted on-demand only
- ✅ Keys never logged or exposed
- ✅ Each user's keys isolated
- ✅ Session token required for all operations
- ⚠️ TODO: Set strong ENCRYPTION_KEY in production
- ⚠️ TODO: Plan for encryption key rotation strategy

## Error Handling

System handles:
- ✅ Missing API keys (returns 401 with helpful message)
- ✅ Invalid API keys (catches auth errors from exchange)
- ✅ Missing passphrase (validates before sending)
- ✅ Database errors (returns 500 with message)
- ✅ Network errors (propagates from fetch)

## Supported Exchanges

| Exchange | Passphrase | Status |
|----------|-----------|--------|
| OKX | Required | ✅ Ready |
| KuCoin | Required | ✅ Ready |
| Binance | Optional | ✅ Ready |

## Troubleshooting

### "Not configured. Please add your API keys in Settings"
- User hasn't added API keys yet
- Direct them to Settings → Exchange API Keys

### "Authentication failed. Check your API keys"
- API Key or Secret is invalid
- User should verify credentials in their exchange account
- Check for typos or copy-paste errors

### "Failed to fetch holdings"
- Network error or exchange API issue
- Check exchange status page
- Retry later

## Next Steps

1. Create `/src/app/dashboard/settings/page.tsx`
2. Add Settings link to header/navigation
3. Update ImportFromExchange modal with metadata check
4. Test with real OKX API keys
5. Deploy and release to users

## Files to Create/Modify

### Create
- [ ] `/src/app/dashboard/settings/page.tsx` - Settings page

### Modify
- [ ] Dashboard header/navigation (add Settings link)
- [ ] ImportFromExchange modal (check configured exchanges)
- [ ] `.env.local` (add ENCRYPTION_KEY)

## API Reference

### POST /api/settings/exchange-keys
Save API keys
```
Headers: Authorization: Bearer {token}
Body: {
  exchange: "OKX",
  apiKey: "...",
  apiSecret: "...",
  passphrase: "..." // optional
}
```

### GET /api/settings/exchange-keys
Get metadata
```
Headers: Authorization: Bearer {token}
Returns: { OKX: { configured, lastUpdated }, ... }
```

### DELETE /api/settings/exchange-keys?exchange=OKX
Remove keys
```
Headers: Authorization: Bearer {token}
```

### GET /api/exchanges/holdings?exchange=OKX
Fetch holdings
```
Headers: Authorization: Bearer {token}
Returns: { success, data: { exchange, holdings } }
```

