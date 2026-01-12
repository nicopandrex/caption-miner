import { createCaptionOverlay } from "./overlay";
import { YouTubeCaptionExtractor } from "./caption-extractor";
import { chineseEngine } from "../lib/chinese";
import { Caption, StudySession } from "../lib/types";

console.log("Caption Miner content script loaded");

let extractor: YouTubeCaptionExtractor | null = null;
let captions: Caption[] = [];
let overlayContainer: HTMLElement | null = null;
let overlayRoot: any = null;
let currentSession: StudySession | null = null;
let currentTokens: string[] = [];
let selectedWords: Set<string> = new Set();
let updateInterval: number | null = null;

// Initialize
async function init() {
  console.log("Initializing Caption Miner...");

  // Show initialization indicator
  showNotification(
    "Caption Miner loaded! Start a study session to see interactive captions.",
    false
  );

  // Wait for YouTube player to be ready
  await waitForElement("video.html5-main-video");

  // Initialize Chinese engine
  await chineseEngine.init();

  // Create caption extractor
  extractor = new YouTubeCaptionExtractor();

  // Load captions
  captions = await extractor.extractCaptions();
  console.log(`Loaded ${captions.length} captions`);

  // Check if study session is active
  const result = await chrome.storage.local.get(["studySession"]);
  if (result.studySession) {
    startSession(result.studySession);
  }

  // Listen for session updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.studySession) {
      if (changes.studySession.newValue) {
        startSession(changes.studySession.newValue);
      } else {
        stopSession();
      }
    }
  });
}

async function startSession(session: StudySession) {
  console.log("Starting study session:", session);
  currentSession = session;
  selectedWords.clear();

  // Show session started notification
  showNotification(
    "Study session started! Click on caption words to highlight them.",
    false
  );

  // Wait for player to be ready
  await waitForElement(".html5-video-player");
  
  // Create overlay container
  const player = document.querySelector(".html5-video-player") as HTMLElement;
  if (!player) {
    console.error("YouTube player not found");
    return;
  }

  // Remove existing overlay if any
  const existing = document.getElementById("caption-miner-overlay");
  if (existing) existing.remove();

  overlayContainer = document.createElement("div");
  overlayContainer.id = "caption-miner-overlay";
  overlayContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
  `;
  player.appendChild(overlayContainer);

  console.log("Overlay container created and added to player");

  // Start updating overlay
  if (updateInterval) clearInterval(updateInterval);
  updateOverlay();
  updateInterval = window.setInterval(updateOverlay, 100);
}

function stopSession() {
  console.log("Stopping study session");
  currentSession = null;
  selectedWords.clear();

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }

  if (overlayRoot) {
    overlayRoot.unmount();
    overlayRoot = null;
  }
}

async function updateOverlay() {
  if (!extractor || !overlayContainer || !currentSession) return;

  // Get current caption from DOM (live)
  const currentCaption = extractor.getCurrentCaption();
  
  if (!currentCaption || !currentCaption.text) {
    currentTokens = [];
    renderOverlay();
    return;
  }

  // Segment caption text
  const tokens = await chineseEngine.segment(currentCaption.text);
  currentTokens = tokens;

  renderOverlay();
}

function renderOverlay() {
  if (!overlayContainer || !extractor) return;

  const currentTime = extractor.getCurrentTime();

  if (overlayRoot) {
    overlayRoot.unmount();
  }

  overlayRoot = createCaptionOverlay(overlayContainer, {
    captions,
    currentTime,
    tokens: currentTokens,
    onTokenClick: handleTokenClick,
    selectedWords,
  });
}

async function handleTokenClick(token: string) {
  if (!currentSession || !extractor) return;

  console.log("Token clicked:", token);

  // Get current caption for context
  const currentCaption = extractor.getCurrentCaption();
  if (!currentCaption) return;

  // Toggle word selection
  if (selectedWords.has(token)) {
    selectedWords.delete(token);
    showNotification(`Deselected: ${token}`);
  } else {
    selectedWords.add(token);
    
    // Get word info for display
    const pinyin = chineseEngine.getPinyin(token);
    const dictEntry = await chineseEngine.lookup(token);
    const definition = dictEntry?.definitions[0] || "No definition found";
    
    showNotification(`${token} (${pinyin}): ${definition}`);
  }

  // Re-render overlay to show selection state
  renderOverlay();
}

function showNotification(message: string, isError = false) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isError ? "#ef4444" : "#10b981"};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 99999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

// Start initialization when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
