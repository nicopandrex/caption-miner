import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import authRoutes from './routes/auth.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import translateRoutes from './routes/translate.js';
import mediaRoutes from './routes/media.js';

const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(cors, {
  origin: true, // Allow all origins in dev; restrict in production
  credentials: true,
});

// Register routes
await fastify.register(authRoutes);
await fastify.register(deckRoutes);
await fastify.register(cardRoutes);
await fastify.register(translateRoutes);
await fastify.register(mediaRoutes);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');
const HOST = '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
