console.log('Offscreen recorder loaded');

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_AUDIO') {
    handleCaptureAudio(message.payload).then(sendResponse);
    return true;
  }
  return false;
});

async function handleCaptureAudio(payload: {
  tabId: number;
  cardId: string;
  clipStart: number;
  clipEnd: number;
  uploadUrl: string;
  objectKey: string;
  autoSeek: boolean;
}) {
  try {
    console.log('Starting audio capture:', payload);

    // Get tab audio stream
    const streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: payload.tabId },
        (streamId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(streamId);
          }
        }
      );
    });

    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    } as any;

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Seek video if needed
    if (payload.autoSeek) {
      await seekVideo(payload.tabId, payload.clipStart);
    }

    // Calculate recording duration
    const duration = payload.clipEnd - payload.clipStart;
    const durationMs = duration * 1000;

    // Start recording
    await recordAudio(stream, durationMs);

    // Stop stream
    stream.getTracks().forEach((track) => track.stop());

    // Create blob
    const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
    recordedChunks = [];

    // Upload to S3
    await uploadToS3(payload.uploadUrl, audioBlob);

    // Notify service worker
    chrome.runtime.sendMessage({
      type: 'AUDIO_CAPTURED',
      payload: {
        cardId: payload.cardId,
        objectKey: payload.objectKey,
        duration,
        success: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Audio capture failed:', error);

    chrome.runtime.sendMessage({
      type: 'AUDIO_CAPTURED',
      payload: {
        cardId: payload.cardId,
        objectKey: '',
        duration: 0,
        success: false,
        error: (error as Error).message,
      },
    });

    return { success: false, error: (error as Error).message };
  }
}

async function seekVideo(tabId: number, time: number) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'SEEK_VIDEO',
      payload: { time },
    });
    // Wait for seek to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Failed to seek video:', error);
  }
}

async function recordAudio(
  stream: MediaStream,
  durationMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      resolve();
    };

    mediaRecorder.onerror = (_event) => {
      reject(new Error('MediaRecorder error'));
    };

    mediaRecorder.start();

    // Stop after duration
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }, durationMs);
  });
}

async function uploadToS3(url: string, blob: Blob) {
  const response = await fetch(url, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': blob.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
}
