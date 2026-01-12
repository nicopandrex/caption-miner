# Backend Setup Instructions

## Prerequisites

1. **Install PostgreSQL 14+**

   - Download from https://www.postgresql.org/download/
   - Create a database named `caption_miner`

2. **Install Node.js 18+**

   - Download from https://nodejs.org/

3. **Get API Keys**
   - DeepL: Sign up at https://www.deepl.com/pro-api (free tier available)
   - S3-compatible storage (AWS S3, Cloudflare R2, or MinIO)

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/caption_miner?schema=public"
JWT_SECRET="generate-a-random-secret-key-here"
DEEPL_API_KEY="your-deepl-api-key"
S3_ENDPOINT="https://your-s3-endpoint.com"
S3_REGION="us-east-1"
S3_BUCKET="caption-miner-audio"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
PORT=3000
```

### 3. Run Database Migrations

```bash
npm run prisma:generate
npm run migrate
```

This will create all necessary tables in your PostgreSQL database.

### 4. Start the Development Server

```bash
npm run dev
```

The server should start at `http://localhost:3000`.

### 5. Test the API

```bash
curl http://localhost:3000/health
```

You should see: `{"status":"ok"}`

## Production Deployment

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure CORS properly in `src/index.ts`
- Use SSL/TLS for database connections
- Set up proper firewall rules

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check database credentials
- Ensure database exists: `createdb caption_miner`

### Prisma Issues

- Clear Prisma cache: `npx prisma generate`
- Reset database: `npx prisma migrate reset` (WARNING: deletes all data)

### S3 Upload Issues

- Verify S3 credentials
- Check bucket permissions (must allow PutObject)
- Test bucket connectivity

## Testing

```bash
npm test
```

## API Documentation

See main README.md for API endpoint documentation.
