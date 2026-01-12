import { FastifyInstance } from 'fastify';
import { translateText } from '../services/deepl.js';
import { translateSchema } from '../types/schemas.js';
import { verifyToken } from '../auth.js';

export default async function translateRoutes(fastify: FastifyInstance) {
  fastify.post('/translate', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      verifyToken(token);

      const { text, sourceLang, targetLang } = translateSchema.parse(
        request.body
      );

      const translatedText = await translateText(text, sourceLang, targetLang);

      return { translation: translatedText };
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(400).send({ error: 'Translation failed' });
    }
  });
}
