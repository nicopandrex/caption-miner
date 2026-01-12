import * as api from '../lib/api';
import { DraftCard } from '../lib/types';

console.log('Caption Miner service worker loaded');

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Service worker received message:', message.type);

  if (message.type === 'CREATE_CARD') {
    handleCreateCard(message.payload, sender.tab?.id).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'AUDIO_CAPTURED') {
    handleAudioCaptured(message.payload).then(sendResponse);
    return true;
  }

  return false;
});

async function handleCreateCard(draftCard: DraftCard, tabId?: number) {
  try {
    console.log('Creating card:', draftCard);

    // 1. Create card in backend
    const card = await api.createCard(draftCard);
    console.log('Card created:', card.id);

    // 2. Get translation if needed
    if (!draftCard.translation && draftCard.sentence) {
      try {
        const translation = await api.translate(draftCard.sentence, 'zh', 'en');
        await api.updateCard(card.id, { translation });
        card.translation = translation;
      } catch (error) {
        console.error('Translation failed:', error);
      }
    }

    // 3. Check if audio capture is enabled
    const session = await getStudySession();
    if (session?.audioEnabled && tabId) {
      // Request audio capture from offscreen document
      await captureAudio(tabId, card.id, draftCard.cueStart, draftCard.cueEnd, session);
    }

    return { success: true, card };
  } catch (error) {
    console.error('Failed to create card:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function captureAudio(
  tabId: number,
  cardId: string,
  cueStart: number,
  cueEnd: number,
  session: any
) {
  try {
    // Get presigned URL
    const { uploadUrl, objectKey } = await api.getPresignedUploadUrl(cardId);

    // Create offscreen document if needed
    await ensureOffscreenDocument();

    // Calculate clip timing
    const clipStart = Math.max(0, cueStart - session.leadIn);
    const clipEnd = cueEnd + session.tailOut;

    // Send capture request to offscreen document
    await chrome.runtime.sendMessage({
      type: 'CAPTURE_AUDIO',
      payload: {
        tabId,
        cardId,
        clipStart,
        clipEnd,
        uploadUrl,
        objectKey,
        autoSeek: session.autoSeek,
      },
    });
  } catch (error) {
    console.error('Audio capture failed:', error);
  }
}

async function handleAudioCaptured(payload: {
  cardId: string;
  objectKey: string;
  duration: number;
  success: boolean;
  error?: string;
}) {
  if (!payload.success) {
    console.error('Audio capture failed:', payload.error);
    return { success: false };
  }

  try {
    // Confirm upload in backend
    await api.confirmMediaUpload(payload.cardId, payload.objectKey, payload.duration);
    console.log('Audio upload confirmed for card:', payload.cardId);
    return { success: true };
  } catch (error) {
    console.error('Failed to confirm media upload:', error);
    return { success: false };
  }
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType],
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
    justification: 'Recording audio from YouTube video',
  });
}

async function getStudySession() {
  const result = await chrome.storage.local.get(['studySession']);
  return result.studySession || null;
}
