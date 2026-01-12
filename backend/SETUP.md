# Starting the Backend Server

The error "Failed to create deck" happens because the backend API server isn't running.

## Quick Setup

### 1. Setup Environment Variables
Create a `.env` file in the `backend` folder:

```bash
cd backend
```

Create `.env` with:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-this"
PORT=3000

# Optional - only if you want translation
DEEPL_API_KEY="your-deepl-api-key"

# Optional - only if you want audio storage
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="your-bucket"
```

### 2. Setup Database
```bash
npm install
npm run prisma:generate
npm run migrate
```

### 3. Start the Server
```bash
npm run dev
```

The server will start on http://localhost:3000

Then the extension will be able to create decks!

## Don't Want Backend? Use Offline Mode
See OFFLINE_MODE.md for how to use just the overlay without backend.
