import { DictionaryEntry } from '../types';

// Local CC-CEDICT dictionary for offline lookups
interface CEDICTEntry {
  pinyin: string;
  definitions: string[];
}

let dictionaryCache: Map<string, CEDICTEntry> | null = null;
let isLoading = false;

// Load dictionary from bundled JSON file
export async function loadDictionary(): Promise<void> {
  if (dictionaryCache || isLoading) return;
  
  isLoading = true;
  
  try {
    const response = await fetch(chrome.runtime.getURL('cedict.json'));
    const data: Record<string, CEDICTEntry> = await response.json();
    
    dictionaryCache = new Map();
    for (const [word, entry] of Object.entries(data)) {
      dictionaryCache.set(word, entry);
    }
    
    console.log('📚 Dictionary loaded with', dictionaryCache.size, 'entries');
  } catch (error) {
    console.error('Failed to load dictionary:', error);
    dictionaryCache = new Map(); // Empty map as fallback
  } finally {
    isLoading = false;
  }
}

export async function lookup(word: string): Promise<DictionaryEntry | null> {
  // Load dictionary on first use
  if (!dictionaryCache && !isLoading) {
    await loadDictionary();
  }
  
  // Wait for loading to complete
  while (isLoading) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (!dictionaryCache) return null;
  
  const entry = dictionaryCache.get(word);
  if (!entry) return null;
  
  return {
    traditional: word,
    simplified: word,
    pinyin: entry.pinyin,
    definitions: entry.definitions
  };
}

export async function isLoaded(): Promise<boolean> {
  return dictionaryCache !== null;
}
