import { z } from 'zod';

// Card types
export type CardMode = 'word' | 'sentence' | 'cloze';
export type Provider = 'youtube' | 'netflix';

export interface Card {
  id: string;
  deckId: string;
  userId: string;
  mode: CardMode;
  provider: Provider;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  cueStart: number;
  cueEnd: number;
  targetWord: string;
  sentence: string;
  sentenceCloze: string;
  pinyin: string;
  definition: string;
  translation: string;
  tags: string[];
  audioUrl: string | null;
  audioMime: string;
  audioDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  language: string;
  createdAt: string;
}

export interface StudySession {
  deckId: string;
  deckName: string;
  mode: CardMode;
  audioEnabled: boolean;
  leadIn: number;
  tailOut: number;
  autoSeek: boolean;
  translationEnabled: boolean;
}

export interface DraftCard {
  deckId: string;
  mode: CardMode;
  provider: Provider;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  cueStart: number;
  cueEnd: number;
  targetWord: string;
  sentence: string;
  sentenceCloze: string;
  pinyin: string;
  definition: string;
  translation?: string;
  tags: string[];
}

export interface Caption {
  text: string;
  start: number;
  end: number;
}

export interface DictionaryEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

// Message types
export type MessageType =
  | 'CREATE_CARD'
  | 'CAPTURE_AUDIO'
  | 'AUDIO_CAPTURED'
  | 'SESSION_STARTED'
  | 'SESSION_STOPPED';

export interface Message {
  type: MessageType;
  payload: any;
}

export const cardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  mode: z.enum(['word', 'sentence', 'cloze']),
  provider: z.string(),
  videoId: z.string(),
  videoUrl: z.string(),
  videoTitle: z.string(),
  channel: z.string(),
  cueStart: z.number(),
  cueEnd: z.number(),
  targetWord: z.string(),
  sentence: z.string(),
  sentenceCloze: z.string(),
  pinyin: z.string(),
  definition: z.string(),
  translation: z.string(),
  tags: z.array(z.string()),
  audioUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
