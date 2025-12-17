# APR Hunter - Setup Guide

## Prerequisites

- Node.js 18+ and npm 9+
- MongoDB (local installation or MongoDB Atlas)
- Git

## Installation

### 1. Install Dependencies

From the root directory, run:

```bash
npm run install:all
```

This will install dependencies for the root workspace, backend, and frontend.

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Copy the environment file:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

**Note**: To get a WalletConnect Project ID:
1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy the Project ID

4. Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Running Both Servers

From the root directory, you can run both servers simultaneously:

```bash
npm run dev
```

This uses `concurrently` to run both backend and frontend.

## MongoDB Setup

### Local MongoDB

1. Install MongoDB locally or use Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

2. The application will automatically create the database `apr_finder` on first connection.

### MongoDB Atlas (Cloud)

1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `backend/.env`

## Project Structure

```
apr-finder/
├── backend/              # Node.js + Fastify API
│   ├── src/
│   │   ├── config/      # Database configuration
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   └── server.ts     # Main server file
│   └── package.json
├── frontend/             # Next.js + React app
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/              # Utilities and API client
│   └── package.json
└── package.json          # Root workspace config
```

## API Endpoints

### APR Data
- `GET /api/apr` - Get all APR data (with filters)
- `GET /api/apr/asset/:asset` - Get APR for specific asset
- `POST /api/apr/compare` - Compare multiple assets
- `GET /api/apr/top` - Get top APR opportunities

### Assets
- `GET /api/assets` - Get all assets
- `GET /api/assets/:symbol` - Get specific asset

### Platforms
- `GET /api/platforms` - Get all platforms and statistics
- `GET /api/platforms/:platform` - Get APR data for platform

### Health Check
- `GET /health` - Server health status

## Seeding Sample Data

To quickly populate the database with sample data for testing:

```bash
cd backend
tsx src/scripts/seed-sample-data.ts
```

This script will create:
- Sample assets: BTC, ETH, BNB, SOL, MATIC
- Sample APR data from various platforms (Binance, Kraken, Compound, Aave, Yearn)

**Note**: The script uses upsert for assets (won't duplicate) but inserts new APR records each time. You may want to clear the database first if running multiple times.

Alternatively, you can manually add data using MongoDB Compass or the MongoDB shell.

## Development Tips

1. **Backend Hot Reload**: The backend uses `tsx watch` for automatic reloading
2. **Frontend Hot Reload**: Next.js provides hot module replacement
3. **TypeScript**: Both projects use TypeScript for type safety
4. **API Testing**: Use tools like Postman or Thunder Client to test API endpoints

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access for MongoDB Atlas

### Port Already in Use
- Backend default: 3001
- Frontend default: 3000
- Change ports in `.env` files if needed

### WalletConnect Issues
- Ensure you have a valid Project ID
- Check browser console for errors
- Verify network connectivity

## Next Steps

1. Set up data collection scripts to fetch real APR data from exchanges/DeFi protocols
2. Implement authentication for user portfolios
3. Add more advanced filtering and sorting
4. Implement real-time updates using WebSockets or polling
5. Add unit and integration tests

## Support

For issues or questions, refer to the main README.md or create an issue in the repository.

