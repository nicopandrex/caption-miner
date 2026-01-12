# Quick Start Guide

## Build & Load Extension

```bash
cd extension
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder

## Test the Caption Overlay

1. **Go to a YouTube video with Chinese captions**
   - Example: Search for "chinese movie" or "learn chinese"
   - Enable captions (CC button)

2. **Open the Extension**
   - Click the Caption Miner icon
   - Side panel opens

3. **Start Session**
   - Go to "Study Session" page
   - Click "Start Study Session"
   - (May need to create a deck first in "Decks" page)

4. **Test Interactions**
   - Play the video
   - You should see captions appear above video controls
   - **Hover** over words → Blue highlight
   - **Click** words → Green highlight + notification shows definition
   - **Click again** → Deselect

## What to Expect

✅ Caption overlay appears above video controls
✅ Words are segmented (Chinese characters split into words)
✅ Interactive highlighting on hover (blue)
✅ Selection on click (green)
✅ Notifications show word definitions
✅ Can select/deselect multiple words

## Console Debug Messages

Open DevTools (F12) to see:
```
Caption Miner content script loaded
Initializing Caption Miner...
Video element found
Starting caption DOM observation
Token clicked: 你好
```

## Known Limitations

- Only works on videos with captions enabled
- Chinese language focused (uses jieba segmentation)
- Definitions from built-in dictionary
- Card creation disabled (focusing on overlay only)

## Troubleshooting

**No overlay appears:**
- Make sure captions are ON (CC button)
- Check study session is started
- Refresh the page

**Words not segmented:**
- Wait a few seconds for Chinese engine to load
- Check console for initialization messages

**Can't click words:**
- Make sure you started a study session
- Check console for errors
