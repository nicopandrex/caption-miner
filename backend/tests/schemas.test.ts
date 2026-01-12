import { describe, it, expect } from 'vitest';
import { translateSchema, createCardSchema } from '../src/types/schemas';

describe('Schema Validation', () => {
  it('should validate translate schema', () => {
    const valid = {
      text: '你好',
      sourceLang: 'zh',
      targetLang: 'en',
    };
    expect(() => translateSchema.parse(valid)).not.toThrow();

    const invalid = { text: '' };
    expect(() => translateSchema.parse(invalid)).toThrow();
  });

  it('should validate create card schema', () => {
    const valid = {
      deckId: '123e4567-e89b-12d3-a456-426614174000',
      mode: 'word' as const,
      provider: 'youtube',
      targetWord: '你好',
      sentence: '你好世界',
    };
    expect(() => createCardSchema.parse(valid)).not.toThrow();

    const invalid = {
      deckId: 'invalid-uuid',
      mode: 'invalid',
    };
    expect(() => createCardSchema.parse(invalid)).toThrow();
  });
});
