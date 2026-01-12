import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Deck schemas
export const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  language: z.string().default('zh'),
});

// Card schemas
export const createCardSchema = z.object({
  deckId: z.string().uuid(),
  mode: z.enum(['word', 'sentence', 'cloze']),
  provider: z.string(),
  videoId: z.string().optional(),
  videoUrl: z.string().optional(),
  videoTitle: z.string().optional(),
  channel: z.string().optional(),
  cueStart: z.number().optional(),
  cueEnd: z.number().optional(),
  targetWord: z.string().optional(),
  sentence: z.string().optional(),
  sentenceCloze: z.string().optional(),
  pinyin: z.string().optional(),
  definition: z.string().optional(),
  translation: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateCardSchema = z.object({
  targetWord: z.string().optional(),
  sentence: z.string().optional(),
  sentenceCloze: z.string().optional(),
  pinyin: z.string().optional(),
  definition: z.string().optional(),
  translation: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Translation schema
export const translateSchema = z.object({
  text: z.string(),
  sourceLang: z.string().default('zh'),
  targetLang: z.string().default('en'),
});

// Media schemas
export const presignSchema = z.object({
  cardId: z.string().uuid(),
  mimeType: z.string().default('audio/webm'),
});

export const confirmMediaSchema = z.object({
  cardId: z.string().uuid(),
  objectKey: z.string(),
  duration: z.number(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type TranslateInput = z.infer<typeof translateSchema>;
export type PresignInput = z.infer<typeof presignSchema>;
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>;
