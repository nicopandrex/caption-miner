const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

// Initialize auth token from storage
chrome.storage.local.get(['authToken'], (result) => {
  if (result.authToken) {
    authToken = result.authToken;
  }
});

export function setAuthToken(token: string) {
  authToken = token;
  chrome.storage.local.set({ authToken: token });
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  chrome.storage.local.remove('authToken');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export async function register(email: string, password: string) {
  const data = await request<{ token: string; user: { id: string; email: string } }>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  setAuthToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: { id: string; email: string } }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  setAuthToken(data.token);
  return data;
}

// Deck API
export async function getDecks() {
  const data = await request<{ decks: any[] }>('/decks');
  return data.decks;
}

export async function createDeck(name: string, language: string = 'zh') {
  const data = await request<{ deck: any }>('/decks', {
    method: 'POST',
    body: JSON.stringify({ name, language }),
  });
  return data.deck;
}

export async function deleteDeck(id: string) {
  await request(`/decks/${id}`, { method: 'DELETE' });
}

// Card API
export async function getCards(deckId?: string, limit: number = 100) {
  const params = new URLSearchParams();
  if (deckId) params.append('deckId', deckId);
  params.append('limit', limit.toString());

  const data = await request<{ cards: any[] }>(`/cards?${params}`);
  return data.cards;
}

export async function createCard(card: any) {
  const data = await request<{ card: any }>('/cards', {
    method: 'POST',
    body: JSON.stringify(card),
  });
  return data.card;
}

export async function updateCard(id: string, updates: any) {
  const data = await request<{ card: any }>(`/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.card;
}

export async function deleteCard(id: string) {
  await request(`/cards/${id}`, { method: 'DELETE' });
}

// Translation API
export async function translate(
  text: string,
  sourceLang: string = 'zh',
  targetLang: string = 'en'
) {
  const data = await request<{ translation: string }>('/translate', {
    method: 'POST',
    body: JSON.stringify({ text, sourceLang, targetLang }),
  });
  return data.translation;
}

// Media API
export async function getPresignedUploadUrl(cardId: string, mimeType: string = 'audio/webm') {
  const data = await request<{ uploadUrl: string; objectKey: string }>(
    '/media/presign',
    {
      method: 'POST',
      body: JSON.stringify({ cardId, mimeType }),
    }
  );
  return data;
}

export async function confirmMediaUpload(
  cardId: string,
  objectKey: string,
  duration: number
) {
  const data = await request<{ card: any }>('/media/confirm', {
    method: 'POST',
    body: JSON.stringify({ cardId, objectKey, duration }),
  });
  return data.card;
}

export async function uploadAudioToS3(url: string, blob: Blob) {
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
