import { FastifyInstance } from 'fastify';
import { prisma } from '../db/client.js';
import { createDeckSchema } from '../types/schemas.js';
import { verifyToken } from '../auth.js';

export default async function deckRoutes(fastify: FastifyInstance) {
  // Get all decks
  fastify.get('/decks', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const decks = await prisma.deck.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return { decks };
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Create deck
  fastify.post('/decks', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const data = createDeckSchema.parse(request.body);

      const deck = await prisma.deck.create({
        data: { ...data, userId },
      });

      return { deck };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid input' });
    }
  });

  // Delete deck
  fastify.delete('/decks/:id', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { userId } = verifyToken(token);

      const { id } = request.params as { id: string };

      // Verify ownership
      const deck = await prisma.deck.findUnique({ where: { id } });
      if (!deck || deck.userId !== userId) {
        return reply.code(404).send({ error: 'Deck not found' });
      }

      await prisma.deck.delete({ where: { id } });

      return { success: true };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request' });
    }
  });
}
