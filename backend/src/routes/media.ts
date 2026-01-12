import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import {
  getPresignedUploadUrl,
  getPublicUrl,
} from '../services/storage.js';
import { presignSchema, confirmMediaSchema } from '../types/schemas.js';
import { verifyToken } from '../auth.js';

export default async function mediaRoutes(fastify: FastifyInstance) {
  // Get presigned upload URL
  fastify.post('/media/presign', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const { cardId, mimeType } = presignSchema.parse(request.body);

      // Verify card ownership
      const card = await prisma.card.findUnique({ where: { id: cardId } });
      if (!card || card.userId !== userId) {
        return reply.code(404).send({ error: 'Card not found' });
      }

      // Generate object key
      const extension = mimeType.split('/')[1] || 'webm';
      const objectKey = `cards/${cardId}.${extension}`;

      // Get presigned URL
      const uploadUrl = await getPresignedUploadUrl(objectKey, mimeType);

      return { uploadUrl, objectKey };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });

  // Confirm media upload and attach to card
  fastify.post('/media/confirm', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const { cardId, objectKey, duration } = confirmMediaSchema.parse(
        request.body
      );

      // Verify card ownership
      const card = await prisma.card.findUnique({ where: { id: cardId } });
      if (!card || card.userId !== userId) {
        return reply.code(404).send({ error: 'Card not found' });
      }

      // Update card with media info
      const audioUrl = getPublicUrl(objectKey);
      const updated = await prisma.card.update({
        where: { id: cardId },
        data: {
          audioUrl,
          audioMime: 'audio/webm',
          audioDuration: duration,
        },
      });

      return { card: updated };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });
}
