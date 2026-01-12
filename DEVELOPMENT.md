# Development Notes

## Architecture Decisions

### Why MV3?

- Manifest V3 is required for new Chrome extensions (V2 deprecated 2024)
- Service workers instead of persistent background pages
- More secure with explicit permissions
- Better performance

### Why Fastify over Express?

- ~2x faster
- Built-in schema validation
- TypeScript-first
- Modern async/await patterns
- Better DX with plugins

### Why Prisma?

- Type-safe database queries
- Automatic migrations
- Great DX with Prisma Studio
- Works well with TypeScript

### Why Offscreen Document for Recording?

- MV3 service workers can't access MediaRecorder directly
- tabCapture API requires a document context
- Offscreen documents are persistent during recording
- Clean separation of concerns

### Why React in Extension?

- Familiar for most developers
- Good component model for side panel
- Vite provides fast builds
- Easy state management

### Why Local Chinese Processing?

- Privacy: No sending user text to external APIs
- Speed: No network latency
- Cost: No per-request charges
- Offline: Works without internet

### Why Backend at All?

- Chrome Sync Storage is limited (100KB per item)
- Audio files need cloud storage
- Multi-device sync
- Analytics and usage tracking
- Rate limiting and abuse prevention

## Code Organization

### Extension Message Flow

```
Content Script (YouTube)
    ↓ postMessage
Service Worker
    ↓ fetch
Backend API
    ↓ response
Service Worker
    ↓ postMessage
Content Script (updates UI)
```

### Audio Capture Flow

```
Service Worker (initiate)
    ↓ runtime.sendMessage
Offscreen Document
    ↓ tabCapture.getMediaStreamId
Service Worker (provides streamId)
    ↓ getUserMedia
Offscreen Document (records)
    ↓ Blob
Service Worker (receives blob)
    ↓ presigned PUT
S3 Storage
    ↓ confirm
Backend API (updates card)
```

## Performance Considerations

### Caption Overlay

- Updates 10x/second to match video playback
- Uses React state for efficient re-renders
- Only renders when caption is active
- Minimal DOM manipulation

### Segmentation

- jieba-wasm runs in ~50ms for typical sentence
- WASM compiled for near-native performance
- Lazy-loaded on first use

### Dictionary Lookup

- Hash map O(1) lookups
- Longest prefix matching for compounds
- Compressed JSON loaded once

### Backend

- Prisma query optimization with indexes
- Translation cache reduces DeepL API calls by ~80%
- Presigned URLs avoid backend proxy overhead

## Security Considerations

### Sensitive Data

- JWT tokens stored in chrome.storage.local
- Passwords hashed with bcrypt (10 rounds)
- DeepL API key only in backend env
- S3 credentials only in backend env

### CORS

- Backend allows extension origin
- In production, restrict to published extension ID

### XSS Prevention

- React auto-escapes by default
- No innerHTML usage
- User content sanitized before database

### CSRF

- JWT in Authorization header (not cookies)
- No state-changing GET requests

## Common Pitfalls & Solutions

### "Invalid manifest" Error

**Cause**: manifest.json syntax error  
**Fix**: Validate JSON at jsonlint.com

### Content Script Not Injecting

**Cause**: YouTube uses client-side routing  
**Fix**: Use MutationObserver to detect page changes

### Audio Capture Silent

**Cause**: Video has no audio track  
**Fix**: Check MediaStreamTrack.enabled

### Presigned URL Expired

**Cause**: Upload took >1 hour  
**Fix**: Increase expiry or handle error and retry

### DeepL API Quota Exceeded

**Cause**: Free tier limit (500k chars/month)  
**Fix**: Implement rate limiting, show quota UI

### Prisma Migration Failed

**Cause**: Database out of sync  
**Fix**: `npx prisma migrate reset` (DELETES DATA)

## Debugging Tips

### Backend Debugging

```bash
# Enable verbose Prisma logs
DATABASE_URL="postgresql://...?connection_limit=5&log=query"

# Check server logs
npm run dev

# Test endpoint
curl http://localhost:3000/health
```

### Extension Debugging

```javascript
// Service worker console
chrome://extensions → Service Worker → Inspect

// Content script console
F12 on YouTube page → Console

// Offscreen document console
chrome://extensions → Offscreen → Inspect
```

### Database Debugging

```bash
# Open Prisma Studio
npx prisma studio

# View tables
psql caption_miner
\dt
SELECT * FROM cards LIMIT 10;
```

## Development Workflow

### Backend Changes

```bash
cd backend

# 1. Edit code
# 2. Run dev server (auto-reloads)
npm run dev

# 3. Test with curl/Postman
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# 4. Run tests
npm test
```

### Extension Changes

```bash
cd extension

# 1. Edit code
# 2. Build (watch mode)
npm run dev

# 3. Reload extension
# Click refresh icon in chrome://extensions

# 4. Test on YouTube
# Open DevTools to see logs
```

### Database Schema Changes

```bash
cd backend

# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_field

# 3. Update types
npx prisma generate

# 4. Update API code to use new field
```

## Testing Strategy

### Unit Tests

- Backend: Vitest for route handlers
- Extension: Not implemented (future: Jest)

### Integration Tests

- Manual testing via extension
- Future: Playwright for E2E

### Load Tests

- Not implemented
- Future: Artillery or k6

## Deployment Checklist

### Backend

- [ ] Set NODE_ENV=production
- [ ] Generate strong JWT_SECRET
- [ ] Configure managed Postgres
- [ ] Setup S3 bucket with CORS
- [ ] Add rate limiting middleware
- [ ] Setup error tracking (Sentry)
- [ ] Configure HTTPS/SSL
- [ ] Setup CI/CD (GitHub Actions)

### Extension

- [ ] Create production icons
- [ ] Update manifest version
- [ ] Build production bundle
- [ ] Test on clean Chrome profile
- [ ] Prepare store listing (screenshots, description)
- [ ] Submit to Chrome Web Store
- [ ] Monitor reviews and ratings

## Future Optimizations

### Backend

- Redis cache for translations
- Database connection pooling
- Batch card creation endpoint
- GraphQL API for flexible queries
- Webhook for card updates

### Extension

- Web Workers for segmentation
- IndexedDB for offline cards
- Incremental caption loading
- Video thumbnail generation
- Batch export to Anki

### Features

- Browser hotkeys for card creation
- Automatic pause on card creation
- Screenshot capture with highlight
- AI-powered example sentences
- Community deck sharing

## Resources

### Documentation

- Chrome Extension MV3: https://developer.chrome.com/docs/extensions/mv3/
- Prisma: https://www.prisma.io/docs
- Fastify: https://www.fastify.io/docs/
- DeepL API: https://www.deepl.com/docs-api

### Libraries

- jieba-wasm: https://github.com/fengkx/jieba-wasm
- pinyin-pro: https://github.com/zh-lx/pinyin-pro
- AnkiConnect: https://foosoft.net/projects/anki-connect/

### Tools

- Prisma Studio: `npx prisma studio`
- Chrome Extension Debugger: chrome://extensions
- React DevTools: https://chrome.google.com/webstore/detail/react-developer-tools

## License

MIT License - See LICENSE file for details.
