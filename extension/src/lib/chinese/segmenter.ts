// Segmenter wrapper using jieba-wasm
let jiebaInstance: any = null;

export async function initSegmenter() {
  if (jiebaInstance) return jiebaInstance;
  
  try {
    // Dynamic import jieba-wasm
    // @ts-ignore - jieba-wasm has incomplete type definitions
    const { Jieba } = await import('jieba-wasm');
    jiebaInstance = Jieba();
    await jiebaInstance.load();
    return jiebaInstance;
  } catch (error) {
    console.error('Failed to load jieba-wasm:', error);
    // Fallback to simple character-based segmentation
    return null;
  }
}

export async function segment(text: string): Promise<string[]> {
  const jieba = await initSegmenter();
  
  if (jieba) {
    try {
      return jieba.cut(text);
    } catch (error) {
      console.error('Segmentation error:', error);
    }
  }
  
  // Fallback: simple character-based segmentation
  return fallbackSegment(text);
}

function fallbackSegment(text: string): string[] {
  // Simple fallback: split by whitespace and punctuation
  const tokens: string[] = [];
  let current = '';
  
  for (const char of text) {
    if (/[\s，。！？、；：""''【】（）《》]/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      if (char.trim()) {
        tokens.push(char);
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
}
