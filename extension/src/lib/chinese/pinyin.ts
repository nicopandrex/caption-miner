import { pinyin as pinyinLib } from 'pinyin-pro';

export function getPinyin(word: string): string {
  try {
    return pinyinLib(word, {
      toneType: 'symbol',
      type: 'array',
    }).join(' ');
  } catch (error) {
    console.error('Pinyin generation error:', error);
    return '';
  }
}

export function getPinyinWithToneNumbers(word: string): string {
  try {
    return pinyinLib(word, {
      toneType: 'num',
      type: 'array',
    }).join(' ');
  } catch (error) {
    console.error('Pinyin generation error:', error);
    return '';
  }
}
