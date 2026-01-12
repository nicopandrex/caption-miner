# Extension Setup Instructions

## Prerequisites

- Node.js 18+
- Chrome or Edge browser
- Backend server running (see backend/README.md)

## Setup Steps

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 3. Build the Extension

```bash
npm run build
```

This creates a `dist/` folder with the compiled extension.

### 4. Load Extension in Chrome

1. Open Chrome/Edge
2. Navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `extension/dist` folder

### 5. Test the Extension

1. Navigate to any YouTube video with Chinese captions
2. Click the Caption Miner extension icon to open side panel
3. Register/login with your credentials
4. Start a study session
5. Click words in the caption overlay to create cards

## Development Mode

For development with hot reload:

```bash
npm run dev
```

After each change, click the refresh icon on the extension card in `chrome://extensions`.

## Project Structure

```
extension/
├── src/
│   ├── background/       # Service worker
│   ├── content/          # YouTube content script
│   ├── offscreen/        # Audio recorder
│   ├── sidepanel/        # React UI
│   ├── lib/              # Shared utilities
│   │   ├── chinese/      # Chinese processing
│   │   ├── api.ts        # Backend API client
│   │   ├── anki.ts       # AnkiConnect client
│   │   └── types.ts      # TypeScript types
│   └── vite-env.d.ts
├── public/
│   ├── manifest.json     # MV3 manifest
│   └── icons/            # Extension icons
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Icon Generation

The extension needs icons in `public/icons/`:

- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

Generate these using an online tool or image editor.

## Troubleshooting

### Extension Won't Load

- Check Chrome console for errors (`chrome://extensions` → Details → Inspect views)
- Verify manifest.json syntax
- Ensure all files are built correctly

### Content Script Not Working

- Check YouTube URL matches `youtube.com/watch*`
- Open DevTools on YouTube page → Console tab
- Look for "Caption Miner content script loaded" message

### Side Panel Not Opening

- Check extension icon is visible
- Right-click extension icon → "Inspect popup"
- Check for errors in console

### API Connection Issues

- Verify backend is running at `VITE_API_URL`
- Check CORS settings in backend
- Open Network tab in DevTools to see failed requests

### Audio Capture Issues

- Grant tabCapture permission when prompted
- Ensure video has audio
- Check offscreen document console: `chrome://extensions` → Service worker → Inspect

## Chinese Dictionary

The extension uses CC-CEDICT for dictionary lookups. For production:

1. Download CC-CEDICT data from https://www.mdbg.net/chinese/dictionary?page=cc-cedict
2. Convert to JSON format
3. Compress with gzip
4. Place in `src/assets/cedict.json.gz`
5. Update `src/lib/chinese/dictionary.ts` to load from file

Current implementation uses a small mock dictionary for demonstration.

## Testing

### Manual Testing Checklist

1. ✅ Install extension without errors
2. ✅ Login and persist auth token
3. ✅ Create deck
4. ✅ Start study session
5. ✅ Caption overlay appears on YouTube
6. ✅ Click word creates card
7. ✅ Audio captures and uploads
8. ✅ View cards in Cards tab
9. ✅ Edit card fields
10. ✅ Export to Anki
11. ✅ Export CSV+zip

## Building for Production

```bash
npm run build
```

Package the `dist/` folder as a zip file for Chrome Web Store submission.

## Publishing to Chrome Web Store

1. Create a developer account at https://chrome.google.com/webstore/devconsole
2. Pay one-time $5 registration fee
3. Prepare store listing (screenshots, description, etc.)
4. Upload zip file
5. Submit for review

See: https://developer.chrome.com/docs/webstore/publish/
