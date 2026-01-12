# Testing the Caption Overlay

## How to Load the Extension

1. Build the extension:
   ```bash
   cd extension
   npm run build
   ```

2. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## How to Test Caption Overlay

1. **Enable Captions on YouTube**:
   - Go to any YouTube video with captions (Chinese videos work best for Chinese segmentation)
   - Click the CC button to enable captions
   - Make sure captions are visible on the video

2. **Start a Study Session**:
   - Click the Caption Miner extension icon in Chrome toolbar
   - The side panel should open
   - Navigate to the "Study Session" page
   - Click "Start Study Session" (you may need to create a deck first)

3. **Test the Overlay**:
   - The overlay should appear above the video controls
   - You should see the current caption text segmented into individual words
   - Each word should be in a separate box

4. **Test Interactions**:
   - **Hover** over words: They should highlight in blue and scale up slightly
   - **Click** on words: They should turn green and show a notification with:
     - The word
     - Pinyin pronunciation
     - Definition from the dictionary
   - Click again to deselect (turns back to normal)

## What's Been Fixed

✅ Overlay container properly positioned in YouTube player
✅ Live caption extraction from DOM (works without pre-loading all captions)
✅ Word segmentation for Chinese text
✅ Interactive word highlighting
✅ Visual feedback (blue hover, green selected)
✅ Notifications showing word definitions
✅ Removed card creation complexity - just highlighting for now

## Troubleshooting

### Overlay doesn't appear
- Make sure captions are enabled on the YouTube video (CC button)
- Check browser console (F12) for any error messages
- Try refreshing the page

### Words aren't segmented properly
- The Chinese segmentation engine needs to load (check console for "Chinese engine loaded")
- Make sure you're watching a video with Chinese captions

### Clicks don't work
- Make sure you started a study session from the side panel
- Check that the overlay has `pointer-events: none` on container but `auto` on words

### Console Debugging
Open the browser console (F12) and look for:
- "Caption Miner content script loaded"
- "Initializing Caption Miner..."
- "Video element found"
- "Starting caption DOM observation"
- "Token clicked: [word]"
