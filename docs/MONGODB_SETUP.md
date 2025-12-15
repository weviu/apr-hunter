# MongoDB Local Setup Guide

## Option 1: Using Docker (Recommended - Easiest)

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** from your Start menu
2. Wait for it to fully start (whale icon in system tray should be steady)
3. Verify it's running by checking the Docker icon in your system tray

### Step 2: Run MongoDB Container
Once Docker Desktop is running, execute this command:

```bash
docker run -d -p 27017:27017 --name mongodb -v mongodb_data:/data/db mongo:latest
```

This command:
- Runs MongoDB in detached mode (`-d`)
- Maps port 27017 (MongoDB default port)
- Names the container `mongodb`
- Creates a volume to persist data (`mongodb_data`)
- Uses the latest MongoDB image

### Step 3: Verify MongoDB is Running
```bash
docker ps
```

You should see a container named `mongodb` running.

### Step 4: Configure Backend
Your backend is already configured to use `mongodb://localhost:27017` by default, so no changes needed!

### Useful Docker Commands:
```bash
# Stop MongoDB
docker stop mongodb

# Start MongoDB (if stopped)
docker start mongodb

# View MongoDB logs
docker logs mongodb

# Remove MongoDB container (WARNING: deletes data)
docker rm -f mongodb
```

---

## Option 2: Install MongoDB Directly on Windows

### Step 1: Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: Latest (7.0 or newer)
   - **Platform**: Windows
   - **Package**: MSI
3. Click **Download**

### Step 2: Install MongoDB
1. Run the downloaded `.msi` installer
2. Choose **Complete** installation
3. Select **Install MongoDB as a Service**
4. Choose **Run service as Network Service user**
5. **Install MongoDB Compass** (GUI tool - recommended)
6. Click **Install**

### Step 3: Verify Installation
Open a new PowerShell/Command Prompt and run:
```bash
mongod --version
```

### Step 4: Start MongoDB Service
MongoDB should start automatically as a Windows service. To verify:
1. Open **Services** (Win + R, type `services.msc`)
2. Look for **MongoDB** service
3. Ensure it's **Running**

If not running, right-click and select **Start**.

### Step 5: Configure Backend
Your backend is already configured to use `mongodb://localhost:27017` by default!

---

## Option 3: MongoDB Atlas (Cloud - Free Tier)

If you prefer cloud hosting:

1. Go to: https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier M0)
4. Create a database user
5. Whitelist your IP (or use `0.0.0.0/0` for development)
6. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net`)
7. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
   ```

---

## Testing Your MongoDB Connection

After setting up MongoDB, test the connection:

### Option A: Using MongoDB Compass (GUI)
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. You should see the connection succeed

### Option B: Using Command Line
```bash
# If using Docker
docker exec -it mongodb mongosh

# If installed directly
mongosh
```

### Option C: Test from Your App
1. Make sure MongoDB is running
2. Start your backend: `cd backend && npm run dev`
3. Check the console - you should see: `✅ Connected to MongoDB`

---

## Troubleshooting

### Docker Issues
- **"Docker daemon not running"**: Start Docker Desktop
- **"Port 27017 already in use"**: Another MongoDB instance is running. Stop it first.
- **"Container name already exists"**: Run `docker rm mongodb` first, then create new container

### Direct Installation Issues
- **"mongod not recognized"**: Add MongoDB bin folder to PATH, or restart terminal
- **"Service won't start"**: Check Windows Event Viewer for errors
- **"Port 27017 in use"**: Stop other MongoDB instances or change port

### Connection Issues
- **"Connection refused"**: MongoDB is not running
- **"Authentication failed"**: Check connection string in `.env`
- **"Network timeout"**: Check firewall settings

---

## Recommended: Use Docker

Docker is the easiest option because:
- ✅ No manual installation needed
- ✅ Easy to start/stop
- ✅ Isolated from your system
- ✅ Easy to remove completely
- ✅ Works the same on all platforms

---

## Next Steps

Once MongoDB is running:

1. **Configure backend** (if using Atlas, update `.env`)
2. **Seed sample data**:
   ```bash
   cd backend
   tsx src/scripts/seed-sample-data.ts
   ```
3. **Start your app**:
   ```bash
   npm run dev
   ```

Your MongoDB connection string in `backend/.env` should be:
```
MONGODB_URI=mongodb://localhost:27017
```

That's it! 🎉

