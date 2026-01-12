const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

interface AnkiConnectRequest {
  action: string;
  version: number;
  params?: any;
}

async function invoke(action: string, params: any = {}): Promise<any> {
  const request: AnkiConnectRequest = { action, version: 6, params };

  const response = await fetch(ANKI_CONNECT_URL, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to connect to AnkiConnect');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.result;
}

export async function checkConnection(): Promise<boolean> {
  try {
    await invoke('version');
    return true;
  } catch {
    return false;
  }
}

export async function getDeckNames(): Promise<string[]> {
  return await invoke('deckNames');
}

export async function createDeck(deckName: string): Promise<void> {
  await invoke('createDeck', { deck: deckName });
}

export async function storeMediaFile(
  filename: string,
  data: string
): Promise<void> {
  await invoke('storeMediaFile', { filename, data });
}

export async function addNote(note: {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags: string[];
  audio?: { filename: string; data: string };
}): Promise<number> {
  return await invoke('addNote', { note });
}

export async function findNotes(query: string): Promise<number[]> {
  return await invoke('findNotes', { query });
}

// Helper to convert blob to base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export card to Anki
export async function exportCard(
  card: any,
  deckName: string,
  modelName: string = 'Chinese Mining'
): Promise<void> {
  const fields: Record<string, string> = {
    Text: card.sentenceCloze || card.sentence,
    Translation: card.translation || '',
    Word: card.targetWord || '',
    Definition: card.definition || '',
    Pinyin: card.pinyin || '',
    Source: `${card.videoTitle} (${card.channel})`,
  };

  const note: any = {
    deckName,
    modelName,
    fields,
    tags: card.tags || [],
  };

  // Download and upload audio if available
  if (card.audioUrl) {
    try {
      const response = await fetch(card.audioUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      const filename = `card_${card.id}.webm`;

      await storeMediaFile(filename, base64);
      fields['Audio'] = `[sound:${filename}]`;
    } catch (error) {
      console.error('Failed to upload audio:', error);
    }
  }

  await addNote(note);
}
