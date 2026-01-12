import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../db/client.js';
import { signToken } from '../auth.js';
import { registerSchema, loginSchema } from '../types/schemas.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/auth/register', async (request, reply) => {
    try {
      const { email, password } = registerSchema.parse(request.body);

      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(400).send({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: { email, passwordHash },
      });

      // Generate JWT
      const token = signToken({ userId: user.id, email: user.email });

      return { token, user: { id: user.id, email: user.email } };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid input' });
    }
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = signToken({ userId: user.id, email: user.email });

      return { token, user: { id: user.id, email: user.email } };
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid input' });
    }
  });
}
