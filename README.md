# Caption Miner - Language Learning Sentence Mining Tool

YouTube-first language learning Chrome extension with backend sync for audio clips and card management. Chinese support initially; architected for Spanish later.

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension (MV3)                │
├─────────────────────────────────────────────────────────┤
│  Content Script (youtube.com/watch)                     │
│  ├─ Caption extraction (<track> cues + DOM fallback)    │
│  ├─ Custom overlay with clickable tokens               │
│  └─ Chinese segmentation + pinyin + dictionary         │
├─────────────────────────────────────────────────────────┤
│  Service Worker                                         │
│  ├─ Auth (JWT)                                          │
│  ├─ Backend API client                                 │
│  └─ Message routing                                     │
├─────────────────────────────────────────────────────────┤
│  Offscreen Document                                     │
│  └─ Audio recording (tabCapture + MediaRecorder)       │
├─────────────────────────────────────────────────────────┤
│  Side Panel (React)                                     │
│  ├─ Study Session (deck/mode/clip settings)            │
│  ├─ Cards List (edit/play/sync)                        │
│  └─ Anki Export (AnkiConnect + CSV fallback)           │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + TypeScript)             │
├─────────────────────────────────────────────────────────┤
│  API (Fastify)                                          │
│  ├─ /auth (register, login)                            │
│  ├─ /decks (list, create)                              │
│  ├─ /cards (CRUD)                                       │
│  ├─ /translate (DeepL proxy + cache)                   │
│  └─ /media (presigned URLs, confirm)                   │
├─────────────────────────────────────────────────────────┤
│  Database (Postgres)                                    │
│  ├─ users                                               │
│  ├─ decks                                               │
│  ├─ cards (metadata)                                    │
│  └─ translation_cache                                   │
├─────────────────────────────────────────────────────────┤
│  Object Storage (S3/R2)                                 │
│  └─ Audio clips (webm/opus)                            │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: Creating a Card

1. **User clicks token in caption overlay**
2. Content script:
   - Segments sentence → tokens
   - Identifies clicked word
   - Gets pinyin + dictionary definition (local)
   - Builds DraftCard payload with cue timestamps
3. Service worker receives message:
   - Calls `/cards` API → receives cardId
   - Calls `/translate` API for sentence translation
   - Requests `/media/presign` → gets S3 upload URL
   - Sends capture request to offscreen document
4. Offscreen document:
   - Auto-seeks video to cueStart - leadIn
   - Starts tabCapture audio stream
   - Records during playback
   - Returns audio blob
5. Service worker:
   - Uploads blob to S3 via presigned URL
   - Calls `/media/confirm` to link audio to card
   - Updates local cache, notifies content script

### Card Schema

```typescript
interface Card {
  id: string;
  deckId: string;
  userId: string;
  mode: "word" | "sentence" | "cloze";

  // Source
  provider: "youtube" | "netflix";
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  cueStart: number;
  cueEnd: number;

  // Content
  targetWord: string; // Clicked word
  sentence: string; // Full caption text
  sentenceCloze: string; // Sentence with [...] replacing targetWord
  pinyin: string; // Pinyin for targetWord
  definition: string; // Dictionary definition
  translation: string; // DeepL sentence translation
  tags: string[];

  // Media
  audioUrl: string | null;
  audioMime: string;
  audioDuration: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### Chinese Processing Engine (Extension-Local)

- **Segmentation**: `jieba-wasm` (WASM port of jieba Chinese word segmenter)
- **Pinyin**: `pinyin-pro` library
- **Dictionary**: Bundled CC-CEDICT (~130k entries, compressed JSON)
  - Lookup: `word → { traditional, simplified, pinyin, definitions[] }`
  - Stored in extension assets, lazy-loaded

### Audio Capture Flow

1. User sets clip preferences:

   - `audioEnabled: boolean`
   - `leadIn: number` (default 0.5s)
   - `tailOut: number` (default 0.5s)
   - `autoSeek: boolean` (default true)

2. On card creation:

   - Calculate `clipStart = max(0, cueStart - leadIn)`
   - Calculate `clipEnd = cueEnd + tailOut`

3. Offscreen recorder:

   - If autoSeek: seek video to clipStart
   - Start MediaRecorder on tabCapture audio
   - Wait for video to reach clipEnd
   - Stop recording → blob (webm/opus)

4. Upload via presigned URL to S3/R2

### Provider Abstraction

```typescript
interface CaptionProvider {
  name: string;
  detect(): boolean;
  extractCaptions(): Caption[];
  getCurrentTime(): number;
  seekTo(time: number): void;
}

class YouTubeProvider implements CaptionProvider {
  /*...*/
}
// Future: NetflixProvider
```

### Language Engine Abstraction

```typescript
interface LanguageEngine {
  language: string;
  segment(text: string): string[];
  getPinyin?(word: string): string;
  lookup(word: string): DictionaryEntry | null;
}

class ChineseEngine implements LanguageEngine {
  /*...*/
}
// Future: SpanishEngine (segment via intl.Segmenter, lookup via custom dict)
```

### Anki Export Strategies

#### Primary: AnkiConnect

- Detect AnkiConnect at `http://127.0.0.1:8765`
- For each card:
  1. `storeMediaFile`: upload audio as `card_<id>.webm`
  2. `addNote`: create note in target deck
- Note type mapping (user-configurable):
  - **Cloze**: `Text`, `Translation`, `Word`, `Definition`, `Pinyin`, `Source`, `Audio`
  - Fields populated from Card model

#### Fallback: CSV + Media Zip

- Generate CSV with Anki-compatible `[sound:card_<id>.webm]` references
- Download zip containing:
  - `cards.csv` (UTF-8 with BOM)
  - `media/card_<id>.webm` files
- User imports CSV via Anki GUI

### API Endpoints

| Method | Path                    | Description                   |
| ------ | ----------------------- | ----------------------------- |
| POST   | `/auth/register`        | Create account → JWT          |
| POST   | `/auth/login`           | Login → JWT                   |
| GET    | `/decks`                | List user's decks             |
| POST   | `/decks`                | Create deck                   |
| DELETE | `/decks/:id`            | Delete deck                   |
| GET    | `/cards?deckId=&limit=` | List cards                    |
| POST   | `/cards`                | Create card metadata → cardId |
| PATCH  | `/cards/:id`            | Update card fields            |
| DELETE | `/cards/:id`            | Delete card                   |
| POST   | `/translate`            | Proxy DeepL, cache by hash    |
| POST   | `/media/presign`        | Get S3 presigned PUT URL      |
| POST   | `/media/confirm`        | Attach uploaded media to card |

### Database Schema (Postgres)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'zh',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL,

  provider VARCHAR(50) NOT NULL,
  video_id VARCHAR(255),
  video_url TEXT,
  video_title TEXT,
  channel VARCHAR(255),
  cue_start DECIMAL(10, 3),
  cue_end DECIMAL(10, 3),

  target_word TEXT,
  sentence TEXT,
  sentence_cloze TEXT,
  pinyin TEXT,
  definition TEXT,
  translation TEXT,
  tags TEXT[],

  audio_url TEXT,
  audio_mime VARCHAR(50),
  audio_duration DECIMAL(10, 3),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE translation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash VARCHAR(64) UNIQUE NOT NULL,
  source_lang VARCHAR(10),
  target_lang VARCHAR(10),
  source_text TEXT,
  translated_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_translation_hash ON translation_cache(hash);
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Postgres 14+
- S3-compatible object storage (AWS S3 / Cloudflare R2 / MinIO)
- DeepL API key (free tier works)
- Chrome/Edge browser

### Backend Setup

1. **Clone and install dependencies:**

```bash
cd backend
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required env vars:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: Random secret for JWT signing
- `DEEPL_API_KEY`: Your DeepL API key
- `S3_ENDPOINT`: Object storage endpoint
- `S3_BUCKET`: Bucket name
- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key
- `S3_REGION`: Region (e.g., 'us-east-1')
- `PORT`: Server port (default 3000)

3. **Run database migrations:**

```bash
npm run migrate
```

4. **Start server:**

```bash
npm run dev
```

### Extension Setup

1. **Install dependencies:**

```bash
cd extension
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
# Set VITE_API_URL to your backend URL (e.g., http://localhost:3000)
```

3. **Build extension:**

```bash
npm run build
```

4. **Load in Chrome:**

- Navigate to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked"
- Select `extension/dist` folder

### Testing the Extension

1. Navigate to any YouTube video with captions
2. Open the extension side panel (click extension icon)
3. Register/login
4. Click "Start Study Session"
5. Select deck, mode (word/sentence/cloze), and clip settings
6. Click any word in the caption overlay
7. Check side panel → Cards to see created card
8. Play audio, edit fields, or export to Anki

---

## Permissions Required

### Chrome Extension Permissions

- `sidePanel`: Display React UI in side panel
- `storage`: Cache auth token and study session state
- `offscreen`: Create offscreen document for audio recording
- `tabCapture`: Capture YouTube tab audio
- Host permissions: `https://www.youtube.com/*`

### User Permissions (on first use)

- **Microphone**: Not needed (we capture tab audio only)
- **Tab Capture**: Chrome will prompt when first recording

---

## Development

### Backend

```bash
npm run dev        # Start with hot reload
npm run build      # Compile TypeScript
npm run test       # Run tests
npm run migrate    # Run Prisma migrations
```

### Extension

```bash
npm run dev        # Build with watch mode
npm run build      # Production build
npm run type-check # TypeScript validation
```

### Project Structure

```
caption-miner/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Fastify server entry
│   │   ├── auth.ts               # JWT utilities
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth endpoints
│   │   │   ├── decks.ts          # Deck CRUD
│   │   │   ├── cards.ts          # Card CRUD
│   │   │   ├── translate.ts      # DeepL proxy
│   │   │   └── media.ts          # S3 presigned URLs
│   │   ├── services/
│   │   │   ├── deepl.ts          # DeepL client
│   │   │   └── storage.ts        # S3 client
│   │   ├── db/
│   │   │   ├── schema.prisma     # Prisma schema
│   │   │   └── client.ts         # Prisma client
│   │   └── types/
│   │       └── schemas.ts        # Zod schemas
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── extension/
│   ├── src/
│   │   ├── manifest.json         # MV3 manifest
│   │   ├── background/
│   │   │   └── service-worker.ts # Background service worker
│   │   ├── content/
│   │   │   ├── youtube.ts        # YouTube content script
│   │   │   ├── overlay.tsx       # Caption overlay UI
│   │   │   └── caption-extractor.ts
│   │   ├── offscreen/
│   │   │   ├── offscreen.html
│   │   │   └── recorder.ts       # Audio recording
│   │   ├── sidepanel/
│   │   │   ├── index.html
│   │   │   ├── App.tsx           # Side panel React app
│   │   │   ├── pages/
│   │   │   │   ├── StudySession.tsx
│   │   │   │   ├── CardsList.tsx
│   │   │   │   └── AnkiExport.tsx
│   │   │   └── components/
│   │   ├── lib/
│   │   │   ├── chinese/
│   │   │   │   ├── segmenter.ts  # jieba-wasm wrapper
│   │   │   │   ├── pinyin.ts     # pinyin-pro wrapper
│   │   │   │   └── dictionary.ts # CC-CEDICT loader
│   │   │   ├── api.ts            # Backend API client
│   │   │   ├── anki.ts           # AnkiConnect client
│   │   │   └── types.ts          # Shared types
│   │   └── assets/
│   │       └── cedict.json.gz    # Compressed dictionary
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## Testing Checklist

### Backend

- [ ] User registration and JWT generation
- [ ] Deck CRUD operations
- [ ] Card creation with all fields
- [ ] Translation caching (same input → cached response)
- [ ] Presigned URL generation
- [ ] Media confirm links audio to card

### Extension

- [ ] Load extension without errors
- [ ] Login persists after reload
- [ ] YouTube caption extraction works
- [ ] Token segmentation displays correctly
- [ ] Clicking token creates card
- [ ] Audio capture and upload succeeds
- [ ] Side panel shows cards list
- [ ] Card editor saves changes
- [ ] AnkiConnect detection
- [ ] Export to Anki works
- [ ] CSV+zip export downloads

---

## Roadmap

### v1.0 (Current)

- [x] YouTube caption mining
- [x] Chinese segmentation + pinyin + dictionary
- [x] Audio clip capture
- [x] Backend sync
- [x] AnkiConnect + CSV export

### v1.1 (Next)

- [ ] Netflix provider support
- [ ] Spanish language engine
- [ ] Bulk card editing
- [ ] Deck statistics
- [ ] Spaced repetition reminders

### v2.0 (Future)

- [ ] Mobile companion app
- [ ] Shared community decks
- [ ] AI-powered context explanations
- [ ] TTS pronunciation practice

---

## License

MIT

---

## Support

For issues, questions, or feature requests, open an issue on GitHub

```

```
