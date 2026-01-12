# 🎬 Caption Miner - Clickable Overlay Testing Guide

## WHAT WAS FIXED

The overlay system has been completely rewritten to be robust and reliable:

1. ✅ **Verified Content Script Loading** - Logs confirm script runs
2. ✅ **Custom Overlay with High Z-Index** - Positioned above YouTube player
3. ✅ **Clickable Tokens** - Each word/character is individually clickable
4. ✅ **SPA Navigation Handling** - Persists when switching videos
5. ✅ **DOM Resilience** - Re-injects if YouTube removes overlay
6. ✅ **Smoke Test** - Minimal test element to verify injection works

## BUILD & INSTALL

```bash
cd extension
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/dist` folder
5. **IMPORTANT**: Click the reload icon on the extension card

## TESTING STEPS

### Step 1: Verify Content Script Loads

1. Open a YouTube video: https://www.youtube.com/watch?v=<any-video>
2. Open DevTools (F12)
3. Go to Console tab
4. You should see:
   ```
   🎬 CM: Content script loaded
   🎬 CM: Starting up...
   🎬 CM: Navigation watcher setup ✓
   🎬 CM: Starting initialization...
   🎬 CM: Player found ✓
   ```

**If you don't see these logs:**
- Refresh the page (sometimes content scripts need a refresh after install)
- Check the extension is enabled in chrome://extensions/
- Verify you're on a `/watch` URL

### Step 2: Test WITHOUT Study Session (Smoke Test)

If you DON'T have a study session active:

1. You should see a **red box** appear above the video controls
2. It says "🎬 CaptionMiner Smoke Test - Click Me!"
3. **Click it** - you should:
   - See console log: `🎬 CM: SMOKE TEST CLICKED! ✓`
   - Get an alert
   - The box turns green

**This confirms the overlay injection is working!**

### Step 3: Test WITH Study Session (Real Overlay)

1. Click the Caption Miner extension icon
2. Go to "Study Session" tab
3. Select or create a deck (should work offline now)
4. Click "Start Study Session"
5. Go back to the YouTube video
6. **Enable captions on the video** (click CC button)

You should see:
```
🎬 CM: Active session found, creating overlay...
🎬 CM: Overlay container created ✓
🎬 CM: Starting caption watcher...
🎬 CM: Caption watcher started ✓
```

### Step 4: Test Caption Overlay

With captions enabled and study session active:

1. **Look for the custom overlay** - It appears as a dark box with blue border above the video controls
2. **Caption text should appear** segmented into clickable words/characters
3. **Hover over a word** - It should:
   - Turn blue
   - Scale up slightly
   - Show a glow effect
4. **Click a word** - It should:
   - Turn green
   - Log to console: `🎬 CM: Token clicked: "word"`
   - Stay selected (click again to deselect)

### Step 5: Test SPA Navigation

1. With overlay visible, click on another video (sidebar or end screen)
2. YouTube navigates WITHOUT full page reload
3. Console should show:
   ```
   🎬 CM: Navigation detected: https://www.youtube.com/watch?v=...
   🎬 CM: Cleaning up...
   🎬 CM: Starting initialization...
   ```
4. Overlay should re-appear on the new video

## DEBUGGING CHECKLIST

### Overlay Not Appearing?

**Check Console Logs:**
- ✅ "CM: Content script loaded" - Script is running
- ✅ "CM: Player found" - Player detected
- ✅ "CM: Overlay container created" - Overlay injected
- ❌ "CM: Player not found!" - Player detection failed

**Check DOM:**
1. Open DevTools Elements tab
2. Find `.html5-video-player` element
3. Inside it, look for `<div id="cm-overlay-root">`
4. If present but not visible, check:
   - z-index is 2147483647
   - pointer-events is auto on child elements
   - position is absolute

**Common Issues:**
- **No captions visible:** Enable YouTube captions (CC button)
- **Study session not active:** Smoke test should appear instead
- **Old cached version:** Hard refresh (Ctrl+Shift+R) or reload extension

### Overlay Not Clickable?

**Check:**
1. Overlay has `pointer-events: auto` on caption box
2. Individual token spans have `pointer-events: auto`
3. No transparent overlays blocking clicks
4. Console shows clicks: `🎬 CM: Token clicked: "..."`

**Test with Smoke Test:**
If the smoke test box is clickable but the caption overlay isn't, there's a style issue. Check z-index and pointer-events in DevTools.

### Captions Not Updating?

**Check:**
1. YouTube captions are enabled
2. Console shows: `🎬 CM: Caption updated: "..."`
3. `.ytp-caption-segment` elements exist in YouTube's DOM
4. MutationObserver is watching the right container

**Fix:**
- Try disabling/re-enabling YouTube captions
- Refresh the page
- Check if YouTube changed their caption DOM structure

## EXPECTED CONSOLE OUTPUT

Complete startup sequence:
```
🎬 CM: Content script loaded
🎬 CM: Starting up...
🎬 CM: Navigation watcher setup ✓
🎬 CM: Starting initialization...
🎬 CM: Player found ✓
🎬 CM: Active session found, creating overlay...
🎬 CM: Creating overlay container...
🎬 CM: Overlay container created ✓
🎬 CM: Starting caption watcher...
🎬 CM: Caption watcher started ✓
🎬 CM: Initialization complete ✓
🎬 CM: Caption updated: "Hello world"
```

When clicking tokens:
```
🎬 CM: Token clicked: "Hello"
🎬 CM: Token clicked: "world"
```

## DOM INSPECTION

To verify overlay exists:

1. Open DevTools → Elements
2. Search for `cm-overlay-root`
3. Expand to see structure:
   ```html
   <div id="cm-overlay-root" style="...">
     <div style="background: rgba(0, 0, 0, 0.9); ...">
       <span data-token="Hello">Hello</span>
       <span data-token="world">world</span>
     </div>
   </div>
   ```

## PERFORMANCE

The overlay uses:
- **MutationObserver** for efficient caption change detection
- **100ms interval** for fallback updates
- **Minimal re-renders** - only when caption text changes
- **High z-index** (2147483647) to stay above all YouTube elements

## NEXT STEPS

Once basic clicking works:

1. ✅ Integrate Chinese segmentation (jieba)
2. ✅ Add word definitions on click
3. ✅ Sync selected words to backend
4. ✅ Add keyboard shortcuts
5. ✅ Improve styling and animations

## TROUBLESHOOTING TIPS

**"Nothing happens":**
- Check extension is enabled
- Refresh YouTube page
- Check console for errors
- Try smoke test first

**"Overlay flickers":**
- YouTube DOM changes detected
- Normal behavior, should stabilize
- Check for console errors

**"Clicks don't register":**
- Inspect element in DevTools
- Check pointer-events CSS
- Verify z-index is highest
- Try smoke test to isolate issue

**"Works on one video but not another":**
- SPA navigation issue
- Check console for re-init logs
- Refresh page if needed

## SUCCESS CRITERIA

✅ Console shows "CM: Content script loaded"
✅ Smoke test box appears and is clickable (without session)
✅ Caption overlay appears (with session + captions enabled)
✅ Tokens change color on hover (blue)
✅ Tokens toggle green on click
✅ Console logs token clicks
✅ Overlay persists when switching videos
✅ Overlay re-injects if YouTube removes it

If all checks pass, your clickable overlay is working! 🎉
