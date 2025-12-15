# Quick Start Guide

Follow these steps to get APR Finder up and running on your machine.

## Step 1: Prerequisites Check

Make sure you have installed:
- ✅ **Node.js 18+** - Check with: `node --version`
- ✅ **npm 9+** - Check with: `npm --version`
- ✅ **MongoDB** - Either local installation or MongoDB Atlas account

## Step 2: Install Dependencies

From the project root directory, run:

```bash
npm run install:all
```

This installs dependencies for:
- Root workspace
- Backend (Node.js + Fastify)
- Frontend (Next.js + React)

**Expected time**: 2-5 minutes

## Step 3: Set Up MongoDB

### Option A: Local MongoDB (Recommended for Development)

**Using Docker** (easiest):
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Or install MongoDB locally**:
- Windows: Download from https://www.mongodb.com/try/download/community
- Mac: `brew install mongodb-community`
- Linux: Follow MongoDB installation guide

### Option B: MongoDB Atlas (Cloud - Free Tier Available)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier M0)
4. Create a database user
5. Whitelist your IP address (or use 0.0.0.0/0 for development)
6. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net`)

## Step 4: Configure Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Create `.env` file:
```bash
# On Windows (PowerShell)
Copy-Item env.example .env

# On Mac/Linux
cp env.example .env
```

3. Edit `.env` file and update MongoDB connection:
```env
MONGODB_URI=mongodb://localhost:27017
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
```

4. Go back to root:
```bash
cd ..
```

## Step 5: Configure Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Create `.env.local` file:
```bash
# On Windows (PowerShell)
Copy-Item env.example .env.local

# On Mac/Linux
cp env.example .env.local
```

3. Edit `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

**Optional - WalletConnect Setup** (for Web3 features):
- Go to https://cloud.walletconnect.com
- Create a free account
- Create a new project
- Copy the Project ID
- Paste it in `.env.local` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

**Note**: The app works without WalletConnect, but Web3 wallet features won't be available.

4. Go back to root:
```bash
cd ..
```

## Step 6: Seed Sample Data (Optional but Recommended)

To populate the database with sample data for testing:

```bash
cd backend
tsx src/scripts/seed-sample-data.ts
cd ..
```

This creates sample assets (BTC, ETH, BNB, SOL, MATIC) and APR data.

## Step 7: Start the Application

From the root directory, run:

```bash
npm run dev
```

This starts both servers:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000

**Or start them separately:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 8: Open the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the APR Finder homepage with:
- Top APR opportunities
- APR comparison dashboard
- Navigation to Assets and Platforms pages

## Troubleshooting

### ❌ "Cannot find module" errors
**Solution**: Make sure you ran `npm run install:all` from the root directory

### ❌ MongoDB connection error
**Solution**: 
- Check if MongoDB is running: `docker ps` (if using Docker)
- Verify connection string in `backend/.env`
- For MongoDB Atlas: Check IP whitelist and credentials

### ❌ Port already in use
**Solution**: 
- Backend (3001): Change `PORT` in `backend/.env`
- Frontend (3000): Change port in `frontend/package.json` scripts or use `-p 3001` flag

### ❌ Frontend can't connect to backend
**Solution**: 
- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches backend port
- Check backend is running on correct port
- Check CORS settings in `backend/src/server.ts`

### ❌ No data showing
**Solution**: 
- Run the seed script: `cd backend && tsx src/scripts/seed-sample-data.ts`
- Check MongoDB connection
- Verify data in MongoDB using MongoDB Compass or CLI

## What's Next?

Once everything is running:

1. ✅ Explore the dashboard and compare APR rates
2. ✅ Check out the Assets and Platforms pages
3. ✅ Connect your Web3 wallet (if WalletConnect is configured)
4. ✅ Start building data collection scripts to fetch real APR data
5. ✅ Customize the UI and add more features

## Need Help?

- Check `SETUP.md` for detailed setup instructions
- Review `README.md` for project overview
- Check console logs for error messages
- Verify all environment variables are set correctly

---

**Happy coding! 🚀**

