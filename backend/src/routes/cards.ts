import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { createCardSchema, updateCardSchema } from '../types/schemas.js';
import { verifyToken } from '../auth.js';

export default async function cardRoutes(fastify: FastifyInstance) {
  // Get cards
  fastify.get('/cards', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const query = request.query as { deckId?: string; limit?: string };
      const limit = query.limit ? parseInt(query.limit) : 100;

      const cards = await prisma.card.findMany({
        where: {
          userId,
          ...(query.deckId && { deckId: query.deckId }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return { cards };
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Create card
  fastify.post('/cards', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const data = createCardSchema.parse(request.body);

      // Verify deck ownership
      const deck = await prisma.deck.findUnique({
        where: { id: data.deckId },
      });
      if (!deck || deck.userId !== userId) {
        return reply.code(404).send({ error: 'Deck not found' });
      }

      const card = await prisma.card.create({
        data: { ...data, userId },
      });

      return { card };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid input' });
    }
  });

  // Update card
  fastify.patch('/cards/:id', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const { id } = request.params as { id: string };
      const data = updateCardSchema.parse(request.body);

      // Verify ownership
      const card = await prisma.card.findUnique({ where: { id } });
      if (!card || card.userId !== userId) {
        return reply.code(404).send({ error: 'Card not found' });
      }

      const updated = await prisma.card.update({
        where: { id },
        data,
      });

      return { card: updated };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid input' });
    }
  });

  // Delete card
  fastify.delete('/cards/:id', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const { id } = request.params as { id: string };

      // Verify ownership
      const card = await prisma.card.findUnique({ where: { id } });
      if (!card || card.userId !== userId) {
        return reply.code(404).send({ error: 'Card not found' });
      }

      await prisma.card.delete({ where: { id } });

      return { success: true };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });
}
