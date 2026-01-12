// ============================================================================
// CAPTION MINER - ROBUST YOUTUBE OVERLAY CONTENT SCRIPT
// ============================================================================
// Features: Clickable overlay, word selection, card creation
// ============================================================================

import type { CardMode, StudySession } from '../lib/types';

console.log("🎬 CM: Content script loaded");

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let overlayRoot: HTMLDivElement | null = null;
let captionObserver: MutationObserver | null = null;
let playerObserver: MutationObserver | null = null;
let lastUrl = location.href;
let activeSession: StudySession | null = null;
let currentSegments: string[] = []; // Word segments
let selectedTokens: Set<number> = new Set(); // Selected token indices
let currentCaption = '';
let tooltipElement: HTMLDivElement | null = null;
let cardButtonElement: HTMLDivElement | null = null;

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  OVERLAY_ID: 'cm-overlay-root',
  TOOLTIP_ID: 'cm-tooltip',
  CARD_BUTTON_ID: 'cm-card-button',
  PLAYER_SELECTOR: '.html5-video-player',
  CAPTION_CONTAINER_SELECTOR: '.ytp-caption-window-container',
  CAPTION_SEGMENT_SELECTOR: '.ytp-caption-segment',
  UPDATE_INTERVAL: 100, // ms
  Z_INDEX: 2147483647,
};

// ============================================================================
// SAFE CHROME STORAGE ACCESS
// ============================================================================
async function safeStorageGet(keys: string[]): Promise<any> {
  try {
    if (!chrome?.storage?.local) {
      throw new Error('Extension context invalidated');
    }
    return await chrome.storage.local.get(keys);
  } catch (error) {
    console.error('🎬 CM: Storage access failed:', error);
    throw error;
  }
}

async function safeStorageSet(items: Record<string, any>): Promise<void> {
  try {
    if (!chrome?.storage?.local) {
      throw new Error('Extension context invalidated');
    }
    await chrome.storage.local.set(items);
  } catch (error) {
    console.error('🎬 CM: Storage write failed:', error);
    throw error;
  }
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================
async function init() {
  console.log("🎬 CM: Starting initialization...");
  
  try {
    // Check if we're on a watch page
    if (!location.pathname.startsWith('/watch')) {
      console.log("🎬 CM: Not on watch page, skipping init");
      return;
    }

    // Wait for player to be ready
    const player = await waitForPlayer();
    if (!player) {
      console.error("🎬 CM: Player not found!");
      return;
    }
    console.log("🎬 CM: Player found ✓");

    // Check for active study session
    const result = await safeStorageGet(['studySession']);
    activeSession = result.studySession || null;

    if (!activeSession) {
      console.log("🎬 CM: No active session");
      return;
    }

    console.log("🎬 CM: Active session found, creating overlay...");
    
    // Create overlay
    await createOverlay(player);
    
    // Create tooltip element
    createTooltip();
    
    // Start watching for caption updates
    startCaptionWatcher();
    
    // Watch for player DOM changes
    watchPlayerDom(player);
    
    console.log("🎬 CM: Initialization complete ✓");
  } catch (error) {
    console.error("🎬 CM: Initialization failed:", error);
  }
}

// ============================================================================
// OVERLAY CREATION
// ============================================================================
async function createOverlay(player: HTMLElement) {
  console.log("🎬 CM: Creating overlay container...");

  // Remove existing overlay
  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }

  const existing = document.getElementById(CONFIG.OVERLAY_ID);
  if (existing) existing.remove();

  // Create overlay root container
  overlayRoot = document.createElement('div');
  overlayRoot.id = CONFIG.OVERLAY_ID;
  
  // Critical styles for overlay
  Object.assign(overlayRoot.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    bottom: '80px',
    top: '0',
    pointerEvents: 'none',
    zIndex: String(CONFIG.Z_INDEX),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '20px',
  });

  player.appendChild(overlayRoot);
  console.log("🎬 CM: Overlay container created ✓");
}

// ============================================================================
// TOOLTIP CREATION
// ============================================================================
function createTooltip() {
  if (tooltipElement) return;

  tooltipElement = document.createElement('div');
  tooltipElement.id = CONFIG.TOOLTIP_ID;
  
  Object.assign(tooltipElement.style, {
    position: 'fixed',
    display: 'none',
    background: 'rgba(0, 0, 0, 0.95)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    zIndex: String(CONFIG.Z_INDEX + 1),
    pointerEvents: 'none',
    maxWidth: '300px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    lineHeight: '1.5',
  });

  document.body.appendChild(tooltipElement);
}

async function showTooltip(word: string, element: HTMLElement) {
  if (!tooltipElement) return;

  // Simple tooltip - just show the word for now
  // TODO: Add pinyin and definition via API call
  tooltipElement.innerHTML = `
    <div style="font-size: 18px; font-weight: 600; color: #60a5fa;">
      ${word}
    </div>
    <div style="font-size: 14px; color: #d1d5db; margin-top: 4px;">
      Click to select
    </div>
  `;

  // Position tooltip above element
  const rect = element.getBoundingClientRect();
  tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
  tooltipElement.style.top = `${rect.top - 10}px`;
  tooltipElement.style.transform = 'translate(-50%, -100%)';
  tooltipElement.style.display = 'block';
}

function hideTooltip() {
  if (tooltipElement) {
    tooltipElement.style.display = 'none';
  }
}

// ============================================================================
// CAPTION RENDERING
// ============================================================================
async function renderOverlay(captionText: string) {
  if (!overlayRoot) return;

  // Clear existing content
  overlayRoot.innerHTML = '';
  currentCaption = captionText;
  selectedTokens.clear();

  if (!captionText || captionText === '') {
    return; // Don't show empty overlay
  }

  // Use smart tokenization with jieba for proper Chinese word segmentation
  currentSegments = await smartTokenize(captionText);
  console.log("🎬 CM: Tokens:", currentSegments);

  // Create caption container
  const captionBox = document.createElement('div');
  Object.assign(captionBox.style, {
    background: 'rgba(0, 0, 0, 0.9)',
    padding: '16px 24px',
    borderRadius: '12px',
    display: 'inline-flex',
    flexWrap: 'wrap',
    maxWidth: '90%',
    pointerEvents: 'auto',
    fontSize: '28px',
    fontWeight: '500',
    color: 'white',
    lineHeight: '1.6',
    userSelect: 'none',
    cursor: 'default',
    border: '2px solid rgba(59, 130, 246, 0.5)',
    gap: '4px',
  });

  // Render each segment
  currentSegments.forEach((segment: string, index: number) => {
    const span = document.createElement('span');
    span.textContent = segment;
    span.dataset.token = segment;
    span.dataset.index = String(index);
    
    Object.assign(span.style, {
      display: 'inline-block',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      pointerEvents: 'auto',
      border: '2px solid transparent',
      position: 'relative',
    });

    // Hover: show tooltip
    span.addEventListener('mouseenter', async function(this: HTMLSpanElement, _e: MouseEvent) {
      if (!this.classList.contains('selected')) {
        this.style.background = 'rgba(59, 130, 246, 0.7)';
        this.style.border = '2px solid rgba(96, 165, 250, 1)';
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.8)';
      }
      await showTooltip(segment, this);
    });

    span.addEventListener('mouseleave', function(this: HTMLSpanElement) {
      if (!this.classList.contains('selected')) {
        this.style.background = 'transparent';
        this.style.border = '2px solid transparent';
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
      }
      hideTooltip();
    });

    // Click to toggle selection
    span.addEventListener('click', function(this: HTMLSpanElement, e: MouseEvent) {
      e.stopPropagation();
      e.preventDefault();
      
      const idx = parseInt(this.dataset.index || '0');
      
      if (selectedTokens.has(idx)) {
        selectedTokens.delete(idx);
        applyUnselectedStyle(this);
        console.log(`🎬 CM: Token deselected: "${segment}"`);
      } else {
        selectedTokens.add(idx);
        applySelectedStyle(this);
        console.log(`🎬 CM: Token selected: "${segment}"`);
      }
      
      updateCardButton();
    });

    captionBox.appendChild(span);
  });

  overlayRoot.appendChild(captionBox);
  
  // Add card creation button
  addCardButton();
}

function applySelectedStyle(span: HTMLSpanElement) {
  span.classList.add('selected');
  span.style.background = 'rgba(34, 197, 94, 0.7)';
  span.style.border = '2px solid rgba(34, 197, 94, 1)';
  span.style.transform = 'scale(1.05)';
  span.style.boxShadow = '0 0 10px rgba(34, 197, 94, 0.8)';
}

function applyUnselectedStyle(span: HTMLSpanElement) {
  span.classList.remove('selected');
  span.style.background = 'transparent';
  span.style.border = '2px solid transparent';
  span.style.transform = 'scale(1)';
  span.style.boxShadow = 'none';
}

// ============================================================================
// SIMPLE TOKENIZATION
// ============================================================================
let jiebaInstance: any = null;

async function initJieba() {
  if (jiebaInstance) return jiebaInstance;
  
  try {
    const jieba = await import('jieba-wasm');
    // jieba-wasm exports functions directly, not a Jieba class
    console.log("🎬 CM: Jieba loaded ✓");
    return jieba;
  } catch (error) {
    console.warn('🎬 CM: Failed to load jieba:', error);
    return null;
  }
}

async function smartTokenize(text: string): Promise<string[]> {
  // Check if text contains Chinese characters
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  
  if (hasChinese) {
    // Try to use jieba for proper Chinese word segmentation
    const jieba = await initJieba();
    if (jieba) {
      try {
        // jieba-wasm's cut function
        const segments = jieba.cut(text, true); // true = use HMM
        // Filter out empty strings and whitespace
        return segments.filter((s: string) => s.trim().length > 0);
      } catch (error) {
        console.warn('🎬 CM: Jieba segmentation failed:', error);
      }
    }
    
    // Fallback: character-by-character for Chinese
    return text.split('').filter(c => c.trim().length > 0);
  } else {
    // For other languages: split by word
    return text.split(/\s+/).filter(w => w.trim().length > 0);
  }
}

// ============================================================================
// CARD CREATION BUTTON
// ============================================================================
function addCardButton() {
  if (!overlayRoot) return;

  // Remove existing button
  if (cardButtonElement) {
    cardButtonElement.remove();
  }

  cardButtonElement = document.createElement('div');
  cardButtonElement.id = CONFIG.CARD_BUTTON_ID;
  
  Object.assign(cardButtonElement.style, {
    marginTop: '16px',
    display: 'flex',
    gap: '12px',
    pointerEvents: 'auto',
  });

  // Word card button
  const wordBtn = createButton('Word Card', 'word', 'rgba(59, 130, 246, 0.9)');
  const sentenceBtn = createButton('Sentence Card', 'sentence', 'rgba(139, 92, 246, 0.9)');
  const clozeBtn = createButton('Cloze Card', 'cloze', 'rgba(236, 72, 153, 0.9)');

  cardButtonElement.appendChild(wordBtn);
  cardButtonElement.appendChild(sentenceBtn);
  cardButtonElement.appendChild(clozeBtn);

  overlayRoot.appendChild(cardButtonElement);
}

function createButton(label: string, mode: CardMode, color: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.dataset.mode = mode;
  
  Object.assign(btn.style, {
    padding: '12px 24px',
    background: color,
    color: 'white',
    border: '2px solid white',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  });

  btn.addEventListener('mouseenter', function(this: HTMLButtonElement) {
    this.style.transform = 'scale(1.05)';
    this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
  });

  btn.addEventListener('mouseleave', function(this: HTMLButtonElement) {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleCreateCard(mode);
  });

  return btn;
}

function updateCardButton() {
  // Enable/disable buttons based on selection
  const hasSelection = selectedTokens.size > 0;
  if (cardButtonElement) {
    cardButtonElement.style.opacity = hasSelection ? '1' : '0.5';
  }
}

// ============================================================================
// CARD CREATION LOGIC
// ============================================================================
async function handleCreateCard(mode: CardMode) {
  if (!activeSession || selectedTokens.size === 0) {
    console.log("🎬 CM: No selection or session");
    return;
  }

  try {
    // Get selected text
    const selectedIndices = Array.from(selectedTokens).sort((a, b) => a - b);
    const targetWord = selectedIndices.map(i => currentSegments[i]).join('');
    
    // Get video info
    const videoId = new URLSearchParams(location.search).get('v') || '';
    const videoTitle = document.title.replace(' - YouTube', '');
    const video = document.querySelector('video');
    const currentTime = video?.currentTime || 0;

    // Pinyin and definition - leave empty for now, backend can fetch these
    const pinyin = '';
    const definition = '';

    // Create sentence with cloze
    let sentenceCloze = currentCaption;
    if (mode === 'cloze') {
      sentenceCloze = currentCaption.replace(targetWord, `{{c1::${targetWord}}}`);
    }

    const cardData = {
      deckId: activeSession.deckId,
      mode,
      provider: 'youtube' as const,
      videoId,
      videoUrl: location.href,
      videoTitle,
      channel: document.querySelector('#channel-name')?.textContent || 'Unknown',
      cueStart: currentTime - 2,
      cueEnd: currentTime + 2,
      targetWord,
      sentence: currentCaption,
      sentenceCloze,
      pinyin,
      definition,
      tags: [],
    };

    console.log("🎬 CM: Creating card:", cardData);

    // Try to create card via API, fallback to local storage
    try {
      const API_URL = 'http://localhost:3000';
      const response = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("🎬 CM: Card created via API ✓", result);
      showSuccess(`${mode.toUpperCase()} card created: ${targetWord}`);
    } catch (apiError) {
      console.warn("🎬 CM: API failed, storing card locally:", apiError);
      
      // Store card locally if API fails
      const localCard = {
        ...cardData,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        audioUrl: null,
        audioMime: 'audio/webm',
        audioDuration: 0,
        userId: 'offline',
      };
      
      const { cards = [] } = await safeStorageGet(['cards']);
      cards.push(localCard);
      await safeStorageSet({ cards });
      
      console.log("🎬 CM: Card saved locally ✓", localCard);
      showSuccess(`${mode.toUpperCase()} card saved offline: ${targetWord}`);
    }

    // Clear selection
    selectedTokens.clear();
    await renderOverlay(currentCaption);

  } catch (error) {
    console.error("🎬 CM: Card creation failed:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Check for extension context invalidation
    if (errorMsg.includes('Extension context invalidated')) {
      showError('Extension reloaded. Please refresh the page to continue.');
    } else {
      showError(`Failed to create card: ${errorMsg}`);
    }
  }
}

function showSuccess(message: string) {
  showNotification(message, 'rgba(34, 197, 94, 0.95)');
}

function showError(message: string) {
  showNotification(message, 'rgba(239, 68, 68, 0.95)');
}

function showNotification(message: string, color: string) {
  const notification = document.createElement('div');
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 24px',
    background: color,
    color: 'white',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    zIndex: String(CONFIG.Z_INDEX + 2),
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease',
  });

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================================================
// CAPTION EXTRACTION
// ============================================================================
function extractCurrentCaptionText(): string {
  const captionSegments = document.querySelectorAll(CONFIG.CAPTION_SEGMENT_SELECTOR);
  if (captionSegments.length === 0) return '';

  const texts = Array.from(captionSegments).map(seg => seg.textContent?.trim() || '');
  return texts.join(' ');
}

// ============================================================================
// CAPTION WATCHER
// ============================================================================
function startCaptionWatcher() {
  if (captionObserver) {
    captionObserver.disconnect();
  }

  let lastText = '';

  const checkAndUpdate = async () => {
    const text = extractCurrentCaptionText();
    if (text && text !== lastText) {
      lastText = text;
      console.log("🎬 CM: Caption updated:", text);
      await renderOverlay(text);
    }
  };

  const container = document.querySelector(CONFIG.CAPTION_CONTAINER_SELECTOR);
  if (container) {
    captionObserver = new MutationObserver(checkAndUpdate);
    captionObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  setInterval(checkAndUpdate, CONFIG.UPDATE_INTERVAL);
  console.log("🎬 CM: Caption watcher started ✓");
}

// ============================================================================
// PLAYER DOM WATCHING
// ============================================================================
function watchPlayerDom(player: HTMLElement) {
  if (playerObserver) {
    playerObserver.disconnect();
  }

  playerObserver = new MutationObserver((_mutations) => {
    if (overlayRoot && !document.contains(overlayRoot)) {
      console.log("🎬 CM: Overlay removed, re-injecting...");
      createOverlay(player);
      startCaptionWatcher();
    }
  });

  playerObserver.observe(player, {
    childList: true,
    subtree: false,
  });
}

// ============================================================================
// SPA NAVIGATION
// ============================================================================
function handleNavigation() {
  const url = location.href;
  if (url !== lastUrl) {
    console.log(`🎬 CM: Navigation detected: ${url}`);
    lastUrl = url;
    cleanup();
    if (location.pathname.startsWith('/watch')) {
      setTimeout(init, 500);
    }
  }
}

function setupNavigationWatcher() {
  const observer = new MutationObserver(handleNavigation);
  const titleElement = document.querySelector('title');
  if (titleElement) {
    observer.observe(titleElement, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener('popstate', handleNavigation);

  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    handleNavigation();
  };

  console.log("🎬 CM: Navigation watcher setup ✓");
}

// ============================================================================
// CLEANUP
// ============================================================================
function cleanup() {
  console.log("🎬 CM: Cleaning up...");

  if (captionObserver) {
    captionObserver.disconnect();
    captionObserver = null;
  }

  if (playerObserver) {
    playerObserver.disconnect();
    playerObserver = null;
  }

  if (overlayRoot) {
    overlayRoot.remove();
    overlayRoot = null;
  }

  if (tooltipElement) {
    tooltipElement.remove();
    tooltipElement = null;
  }

  if (cardButtonElement) {
    cardButtonElement.remove();
    cardButtonElement = null;
  }

  selectedTokens.clear();
  currentSegments = [];
  currentCaption = '';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
async function waitForPlayer(timeout = 10000): Promise<HTMLElement | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const player = document.querySelector(CONFIG.PLAYER_SELECTOR);
    if (player) {
      return player as HTMLElement;
    }
    await sleep(100);
  }
  
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// CHROME STORAGE LISTENER
// ============================================================================
chrome.storage.onChanged.addListener((changes) => {
  if (changes.studySession) {
    console.log("🎬 CM: Study session changed");
    activeSession = changes.studySession.newValue || null;
    cleanup();
    if (location.pathname.startsWith('/watch')) {
      setTimeout(init, 100);
    }
  }
});

// ============================================================================
// STARTUP
// ============================================================================
(async function startup() {
  console.log("🎬 CM: Starting up...");
  setupNavigationWatcher();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    await init();
  }
})();
