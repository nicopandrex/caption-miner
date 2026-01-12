# Quick Start Guide

This guide will help you get Caption Miner running locally in ~15 minutes.

## Step 1: Backend Setup (5 minutes)

### Install PostgreSQL

**Windows:**

```powershell
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Linux:**

```bash
sudo apt-get install postgresql
sudo systemctl start postgresql
```

### Create Database

```bash
createdb caption_miner
```

### Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` - **minimum required**:

```env
DATABASE_URL="postgresql://localhost:5432/caption_miner?schema=public"
JWT_SECRET="your-random-secret-here"
DEEPL_API_KEY="your-deepl-key"  # Get free key at deepl.com/pro-api
```

For now, you can skip S3 setup - audio capture will fail but card creation will work.

### Run Migrations & Start

```bash
npm run prisma:generate
npm run migrate
npm run dev
```

Backend should be at http://localhost:3000

## Step 2: Extension Setup (5 minutes)

```bash
cd extension
npm install
cp .env.example .env
```

`.env` should contain:

```env
VITE_API_URL=http://localhost:3000
```

### Build Extension

```bash
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `caption-miner/extension/dist` folder

## Step 3: Test It (5 minutes)

1. **Open YouTube** with Chinese captions

   - Example: https://www.youtube.com/watch?v=BIATCLSjA7I
   - Enable captions (CC button)

2. **Open Caption Miner side panel**

   - Click extension icon in Chrome toolbar

3. **Register account**

   - Use any email/password (stored locally)

4. **Start study session**

   - Create a deck (e.g., "Chinese Study")
   - Select mode: Word
   - Click "Start Study Session"

5. **Mine sentences**
   - Caption overlay should appear on video
   - Click any Chinese word
   - Check "Cards" tab to see created card

## Common Issues

### Backend won't start

```bash
# Make sure PostgreSQL is running
# On Windows:
pg_ctl status

# Create database if missing:
createdb caption_miner
```

### Extension won't load

- Check `chrome://extensions` for errors
- Verify `dist` folder exists after build
- Try `npm run build` again

### No caption overlay

- Make sure YouTube has captions enabled (CC button)
- Check that study session is active (Session tab should show "Active Session")
- Open DevTools Console on YouTube to see logs

### API connection failed

- Verify backend is running: `curl http://localhost:3000/health`
- Check VITE_API_URL in extension/.env
- Rebuild extension after changing .env: `npm run build`

## S3 Setup (Optional - for audio capture)

### Option 1: AWS S3

1. Create S3 bucket at https://s3.console.aws.amazon.com/
2. Create IAM user with `s3:PutObject` permission
3. Add to backend `.env`:

```env
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
```

### Option 2: Cloudflare R2 (Recommended - Free 10GB)

1. Sign up at https://dash.cloudflare.com/
2. R2 → Create bucket
3. Settings → API Tokens → Create API Token
4. Add to backend `.env`:

```env
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="caption-miner"
S3_ACCESS_KEY_ID="your-r2-access-key"
S3_SECRET_ACCESS_KEY="your-r2-secret-key"
```

### Option 3: MinIO (Local testing)

```bash
# Install MinIO
# Windows: choco install minio
# macOS: brew install minio/stable/minio
# Linux: wget https://dl.min.io/server/minio/release/linux-amd64/minio

# Start MinIO
minio server ~/minio-data

# Access console at http://localhost:9000
# Default credentials: minioadmin / minioadmin

# Create bucket named "caption-miner"

# Add to backend .env:
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="caption-miner"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
```

## Anki Setup (Optional - for export)

1. Install Anki from https://apps.ankiweb.net/
2. Install AnkiConnect add-on:
   - Tools → Add-ons → Get Add-ons
   - Code: `2055492159`
3. Restart Anki
4. Extension → Anki tab should show "Connected"

## Next Steps

- See main [README.md](README.md) for full documentation
- Check [backend/README.md](backend/README.md) for API details
- Check [extension/README.md](extension/README.md) for extension architecture

## Getting Help

- Check console logs (DevTools in browser and backend terminal)
- Review error messages carefully
- Ensure all services are running (PostgreSQL, backend, Anki if using)
