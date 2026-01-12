import { segment } from './segmenter';
import { getPinyin } from './pinyin';
import { lookup, loadDictionary } from './dictionary';
import { DictionaryEntry } from '../types';

export interface ChineseEngine {
  segment: (text: string) => Promise<string[]>;
  getPinyin: (word: string) => string;
  lookup: (word: string) => Promise<DictionaryEntry | null>;
  init: () => Promise<void>;
}

class ChineseEngineImpl implements ChineseEngine {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    await loadDictionary();
    this.initialized = true;
  }

  async segment(text: string): Promise<string[]> {
    return segment(text);
  }

  getPinyin(word: string): string {
    return getPinyin(word);
  }

  async lookup(word: string): Promise<DictionaryEntry | null> {
    return lookup(word);
  }
}

export const chineseEngine = new ChineseEngineImpl();
