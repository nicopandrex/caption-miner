import crypto from 'crypto';
import { prisma } from '../db/client.js';

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

interface DeepLTranslationResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // Generate hash for caching
  const hash = crypto
    .createHash('sha256')
    .update(`${sourceLang}:${targetLang}:${text}`)
    .digest('hex');

  // Check cache
  const cached = await prisma.translationCache.findUnique({
    where: { hash },
  });

  if (cached) {
    return cached.translatedText;
  }

  // Call DeepL API
  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
    },
    body: new URLSearchParams({
      text,
      source_lang: sourceLang.toUpperCase(),
      target_lang: targetLang.toUpperCase(),
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.statusText}`);
  }

  const data = await response.json() as DeepLTranslationResponse;
  const translatedText = data.translations[0].text;

  // Cache the result
  await prisma.translationCache.create({
    data: {
      hash,
      sourceLang,
      targetLang,
      sourceText: text,
      translatedText,
    },
  });

  return translatedText;
}
