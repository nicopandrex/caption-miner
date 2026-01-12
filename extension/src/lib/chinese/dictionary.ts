import { DictionaryEntry } from '../types';

// Simplified CC-CEDICT mock data structure
// In production, this would load from a compressed JSON file
interface CEDICTEntry {
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

let dictionary: Map<string, CEDICTEntry> | null = null;
let loading = false;

// Mock dictionary with common words for demo
const MOCK_DICTIONARY: CEDICTEntry[] = [
  {
    traditional: '你好',
    simplified: '你好',
    pinyin: 'nǐ hǎo',
    definitions: ['hello', 'hi'],
  },
  {
    traditional: '世界',
    simplified: '世界',
    pinyin: 'shì jiè',
    definitions: ['world'],
  },
  {
    traditional: '中文',
    simplified: '中文',
    pinyin: 'zhōng wén',
    definitions: ['Chinese language'],
  },
  {
    traditional: '學習',
    simplified: '学习',
    pinyin: 'xué xí',
    definitions: ['to study', 'to learn'],
  },
  {
    traditional: '音樂',
    simplified: '音乐',
    pinyin: 'yīn yuè',
    definitions: ['music'],
  },
];

export async function loadDictionary(): Promise<void> {
  if (dictionary || loading) return;
  
  loading = true;
  
  try {
    // In production, load from compressed JSON:
    // const response = await fetch(chrome.runtime.getURL('assets/cedict.json.gz'));
    // const data = await response.json();
    
    // For now, use mock data
    dictionary = new Map();
    for (const entry of MOCK_DICTIONARY) {
      dictionary.set(entry.simplified, entry);
      if (entry.traditional !== entry.simplified) {
        dictionary.set(entry.traditional, entry);
      }
    }
  } catch (error) {
    console.error('Failed to load dictionary:', error);
    dictionary = new Map();
  } finally {
    loading = false;
  }
}

export async function lookup(word: string): Promise<DictionaryEntry | null> {
  if (!dictionary) {
    await loadDictionary();
  }
  
  if (!dictionary) return null;
  
  const entry = dictionary.get(word);
  if (!entry) {
    // Try to find longest prefix match
    for (let len = word.length - 1; len > 0; len--) {
      const prefix = word.substring(0, len);
      const match = dictionary.get(prefix);
      if (match) return match;
    }
    return null;
  }
  
  return entry;
}

export async function isLoaded(): Promise<boolean> {
  return dictionary !== null;
}
