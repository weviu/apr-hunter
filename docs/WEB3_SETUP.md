# Web3 Configuration Guide

## ⚠️ IMPORTANT: Configure Web3 Wallet Connection

You have two options for Web3 wallet connection:

### Option 1: ConnectWallet.network (Recommended - No Setup Required) ⭐
- **Free and open** - No API keys or project IDs needed
- **Easy setup** - Just install the package
- **Works out of the box**

### Option 2: WalletConnect (Requires Project ID)
- Requires a free WalletConnect Project ID
- More widely adopted
- Used by RainbowKit

## Option 1: Direct Wallet Connection (No Setup Required) ⭐

This option uses wagmi directly with injected wallets (MetaMask, browser extensions, etc.) - **no API keys needed!**

### Step 1: Update Providers

Replace `frontend/app/providers.tsx` with the simple version:

```bash
cd frontend
cp app/providers-connectwallet.tsx app/providers.tsx
```

### Step 2: Update WalletConnect Component

Replace `frontend/components/WalletConnect.tsx` with the simple version:

```bash
cp components/WalletConnect-Simple.tsx components/WalletConnect.tsx
```

### Step 3: Restart Frontend

```bash
npm run dev
```

**That's it!** Users can connect MetaMask and other browser extension wallets immediately. No API keys or project IDs needed.

**Note**: If you want to use ConnectWallet.network specifically, you'll need to:
1. Check their documentation for the exact package name and setup
2. Install their package: `npm install [package-name]`
3. Follow their integration guide

---

## Option 2: WalletConnect Setup (Alternative)

### Step 1: Get WalletConnect Project ID

1. Go to **https://cloud.walletconnect.com**
2. Sign up for a free account (or log in)
3. Click **"Create New Project"**
4. Fill in:
   - **Project Name**: APR Finder (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Allowed Domains**: `localhost:3000` (add your production domain later)
5. Click **"Create"**
6. Copy your **Project ID** (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 2: Configure Frontend

1. Open `frontend/.env.local` (create it if it doesn't exist)
2. Add your WalletConnect Project ID:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

3. Restart your frontend server:
```bash
cd frontend
npm run dev
```

## Step 3: Verify Setup

1. Open your app at `http://localhost:3000`
2. Look for the wallet connection button in the header
3. Click it - you should see wallet options (MetaMask, WalletConnect, etc.)
4. Connect your wallet to test

## What Works Without WalletConnect

The app works perfectly fine without WalletConnect configured:
- ✅ View APR data
- ✅ Compare opportunities
- ✅ Browse assets and platforms
- ✅ All core features

**Web3 features that require WalletConnect:**
- 🔐 Wallet connection
- 📊 Web3 portfolio tracking (Phase 2)
- 🔗 Blockchain data display
- 💼 Cross-chain portfolio view

## Troubleshooting

### "Wallet Not Configured" Message
- This is normal if `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is not set
- The app works fine without it
- Follow Step 1-2 above to enable wallet features

### Wallet Connection Fails
- Check that your Project ID is correct
- Verify `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is in `.env.local` (not `.env`)
- Restart the frontend server after adding the variable
- Check browser console for errors

### Production Setup
When deploying to production:
1. Update your WalletConnect project settings
2. Add your production domain to "Allowed Domains"
3. Update `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in your production environment variables

## Next Steps

Once Web3 is configured:
- Users can connect their wallets
- You can implement Web3 portfolio tracking (Phase 2)
- Add blockchain data display features
- Enable cross-chain portfolio aggregation

---

**Note**: Web3 features are optional. The core platform works great without them!

