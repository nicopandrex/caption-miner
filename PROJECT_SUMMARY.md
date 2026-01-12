# Caption Miner - Project Summary

## What Was Built

A complete **YouTube language learning sentence mining tool** with:

- ✅ Chrome Extension (MV3) with side panel UI
- ✅ Node.js backend with PostgreSQL database
- ✅ Chinese language processing (segmentation, pinyin, dictionary)
- ✅ Audio clip capture and cloud storage
- ✅ Anki export (AnkiConnect + CSV fallback)

## Project Structure

```
caption-miner/
├── README.md                 # Comprehensive technical documentation
├── QUICKSTART.md            # 15-minute setup guide
├── backend/                 # Node.js + TypeScript + Fastify
│   ├── src/
│   │   ├── index.ts         # Server entry point
│   │   ├── auth.ts          # JWT utilities
│   │   ├── routes/          # API endpoints
│   │   │   ├── auth.ts      # POST /auth/register, /auth/login
│   │   │   ├── decks.ts     # Deck CRUD
│   │   │   ├── cards.ts     # Card CRUD
│   │   │   ├── translate.ts # DeepL proxy with caching
│   │   │   └── media.ts     # S3 presigned URLs
│   │   ├── services/
│   │   │   ├── deepl.ts     # Translation service
│   │   │   └── storage.ts   # S3 client
│   │   ├── db/
│   │   │   └── client.ts    # Prisma client
│   │   └── types/
│   │       └── schemas.ts   # Zod validation schemas
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── tests/               # Vitest unit tests
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── extension/               # Chrome Extension MV3
│   ├── src/
│   │   ├── background/
│   │   │   └── service-worker.ts    # Handles card creation, API calls
│   │   ├── content/
│   │   │   ├── youtube.tsx          # Main content script
│   │   │   ├── overlay.tsx          # Caption overlay UI (React)
│   │   │   └── caption-extractor.ts # Caption parsing
│   │   ├── offscreen/
│   │   │   ├── offscreen.html
│   │   │   └── recorder.ts          # Audio capture via MediaRecorder
│   │   ├── sidepanel/
│   │   │   ├── App.tsx              # Main React app
│   │   │   ├── pages/
│   │   │   │   ├── Auth.tsx         # Login/register
│   │   │   │   ├── StudySession.tsx # Session management
│   │   │   │   ├── CardsList.tsx    # Card browser/editor
│   │   │   │   └── AnkiExport.tsx   # Export interface
│   │   │   └── styles.css
│   │   └── lib/
│   │       ├── chinese/
│   │       │   ├── segmenter.ts     # jieba-wasm wrapper
│   │       │   ├── pinyin.ts        # pinyin-pro wrapper
│   │       │   └── dictionary.ts    # CC-CEDICT lookup
│   │       ├── api.ts               # Backend API client
│   │       ├── anki.ts              # AnkiConnect client
│   │       └── types.ts             # Shared TypeScript types
│   ├── public/
│   │   ├── manifest.json            # MV3 manifest
│   │   └── icons/                   # Extension icons (16, 48, 128)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
└── .gitignore
```

## Key Features Implemented

### 1. Backend API (Fastify + Postgres)

**Authentication:**

- JWT-based auth with bcrypt password hashing
- `/auth/register` - Create account
- `/auth/login` - Login and get token

**Deck Management:**

- `/decks` - GET (list), POST (create), DELETE (remove)
- Support for multiple languages (zh, es future)

**Card Management:**

- `/cards` - Full CRUD operations
- Query by deck, limit results
- Rich metadata: video info, timestamps, translations, audio

**Translation:**

- `/translate` - Proxy to DeepL API
- SHA-256 hash-based caching to minimize API calls

**Media:**

- `/media/presign` - Generate S3 presigned upload URLs
- `/media/confirm` - Attach uploaded audio to card
- Supports any S3-compatible storage (AWS, R2, MinIO)

**Database Schema:**

- `users` - User accounts
- `decks` - Card collections
- `cards` - Full card data with timestamps, translations, audio
- `translation_cache` - DeepL response cache

### 2. Chrome Extension (MV3)

**Service Worker:**

- Manages auth token in local storage
- Routes messages between content script and backend
- Handles card creation workflow
- Coordinates audio capture

**Content Script (YouTube):**

- Detects YouTube video player
- Extracts captions from `<track>` elements
- Segments Chinese text with jieba-wasm
- Renders custom clickable caption overlay
- Generates pinyin and dictionary lookups locally
- Sends draft cards to service worker

**Offscreen Document:**

- Uses `chrome.tabCapture` API to capture tab audio
- MediaRecorder with webm/opus codec
- Auto-seeks video and records clip window
- Uploads directly to S3 via presigned URL

**Side Panel UI (React):**

- **Auth page**: Login/register with backend
- **Study Session**: Configure deck, mode, clip settings
- **Cards List**: Browse, edit, delete cards
- **Anki Export**: AnkiConnect integration + CSV fallback

**Chinese Processing:**

- Segmentation: jieba-wasm (WASM-based Chinese tokenizer)
- Pinyin: pinyin-pro library with tone marks
- Dictionary: CC-CEDICT lookup (currently mock data)

### 3. Anki Integration

**AnkiConnect (Primary):**

- Auto-detects Anki at `http://127.0.0.1:8765`
- `storeMediaFile` - Uploads audio files
- `addNote` - Creates Anki notes with all fields
- Supports custom note types

**CSV Export (Fallback):**

- Generates Anki-compatible CSV with UTF-8 BOM
- Creates zip archive with audio files
- Uses `[sound:filename.webm]` references
- User imports manually via Anki GUI

## Technical Highlights

### Architecture Patterns

✅ **Provider Abstraction**: `CaptionProvider` interface allows easy addition of Netflix, Amazon Prime, etc.

✅ **Language Engine Abstraction**: `LanguageEngine` interface supports adding Spanish, Japanese, etc.

✅ **MV3 Compliance**: Uses service worker, offscreen documents, proper message passing

✅ **Type Safety**: Zod schemas for runtime validation, TypeScript throughout

✅ **Caching**: Translation cache reduces API costs

✅ **Presigned URLs**: Secure, direct-to-S3 uploads without backend proxy

### Security

- JWT tokens with expiration
- bcrypt password hashing
- CORS configuration for API
- No API keys in extension code
- Presigned URL expiration (1 hour)

### Performance

- Caption overlay renders at 10 FPS
- Lazy-loaded dictionary
- Minimal main thread blocking
- Efficient Prisma queries with indexes

## What's Working

✅ User registration and login  
✅ Deck creation and management  
✅ Study session with mode selection  
✅ YouTube caption extraction  
✅ Chinese word segmentation  
✅ Pinyin generation  
✅ Dictionary lookup (mock data)  
✅ Translation via DeepL  
✅ Card creation with full metadata  
✅ Audio capture (with S3 setup)  
✅ Card editing  
✅ AnkiConnect export  
✅ CSV+zip export

## What's Mock/TODO

🚧 **Icon Files**: Placeholder icons need to be created (16x16, 48x48, 128x128 PNG)

🚧 **CC-CEDICT Dictionary**: Currently uses mock data (5 entries). Production needs:

- Download CC-CEDICT from https://www.mdbg.net/chinese/dictionary?page=cc-cedict
- Parse and convert to JSON
- Compress with gzip
- Place in `extension/src/assets/cedict.json.gz`
- Update loader in `dictionary.ts`

🚧 **Netflix Support**: Provider abstraction is ready, just need to implement `NetflixProvider`

🚧 **Spanish Language**: Engine abstraction is ready, just need Spanish dictionary and note type

🚧 **Production Deployment**:

- Backend needs proper hosting (Railway, Render, Fly.io)
- Extension needs Chrome Web Store submission
- Database migrations for production

## Testing Instructions

### Backend Testing

```bash
cd backend
npm test
```

Tests included:

- Schema validation (Zod)
- Basic card/deck models

### Extension Testing

Manual checklist (see extension/README.md):

1. Load extension → no errors
2. Login → token persists
3. Create deck → appears in list
4. Start session → overlay appears
5. Click word → card created
6. View cards → card shows correct data
7. Edit card → changes save
8. Export to Anki → note created
9. Export CSV → zip downloads

### Integration Testing

End-to-end flow:

1. Register user via extension
2. Create deck "Test Deck"
3. Navigate to YouTube video: https://www.youtube.com/watch?v=BIATCLSjA7I
4. Enable Chinese captions
5. Start study session
6. Click word "你好"
7. Verify card created in backend database
8. Check audio uploaded to S3 (if configured)
9. Export to Anki
10. Verify note in Anki desktop

## Known Limitations

1. **YouTube Only**: Netflix support planned but not implemented
2. **Chinese Only**: Spanish support planned but not implemented
3. **Caption Extraction**: Relies on YouTube's caption API; may break with YouTube updates
4. **Audio Quality**: Captured from tab audio, not direct source
5. **Dictionary**: Mock data; needs full CC-CEDICT integration
6. **Rate Limiting**: No rate limiting on API endpoints
7. **Error Recovery**: Limited retry logic for failed uploads

## Dependencies

### Backend

- `fastify` - Web framework
- `@prisma/client` - Database ORM
- `@aws-sdk/client-s3` - S3 client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT auth
- `zod` - Schema validation

### Extension

- `react` + `react-dom` - UI framework
- `jieba-wasm` - Chinese segmentation
- `pinyin-pro` - Pinyin generation
- `jszip` - CSV export
- `zod` - Validation
- `vite` - Build tool

## API Key Requirements

1. **DeepL API Key** (Free tier: 500k chars/month)

   - Get at: https://www.deepl.com/pro-api

2. **S3-Compatible Storage** (Optional for audio)

   - AWS S3 (free tier 5GB)
   - Cloudflare R2 (free 10GB)
   - MinIO (self-hosted)

3. **PostgreSQL Database**
   - Local install or hosted (Supabase, Railway, etc.)

## Next Steps for Production

1. **Generate Icons**: Create 16x16, 48x48, 128x128 PNG icons
2. **Integrate CC-CEDICT**: Full dictionary with ~130k entries
3. **Deploy Backend**: Railway/Render with managed Postgres
4. **Setup S3**: Cloudflare R2 recommended (free 10GB)
5. **Add Rate Limiting**: Protect API endpoints
6. **Add Sentry**: Error tracking for both backend and extension
7. **Write E2E Tests**: Playwright for full user flows
8. **Submit to Chrome Web Store**: $5 one-time fee + review process
9. **Create Landing Page**: Explain features, showcase demo
10. **Add Analytics**: Track usage patterns (privacy-respecting)

## Contributing

This is a v1 implementation focused on core functionality. Future contributions could add:

- Netflix/Amazon Prime support
- Spanish/Japanese language engines
- Spaced repetition reminders
- Shared community decks
- Mobile app companion
- AI-powered context explanations
- Better UI/UX design
- Comprehensive test coverage

## License

MIT - Feel free to use, modify, and distribute.

---

Built with ❤️ for language learners who want to mine sentences from real content.
