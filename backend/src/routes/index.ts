import { FastifyInstance } from 'fastify';
import { aprRoutes } from './apr';
import { assetRoutes } from './asset';
import { platformRoutes } from './platform';
import { historyRoutes } from './history';
import { authRoutes } from './auth';
import { positionRoutes } from './positions';
import { alertRoutes } from './alerts';
import { notificationRoutes } from './notifications';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(aprRoutes, { prefix: '/api/apr' });
  await fastify.register(assetRoutes, { prefix: '/api/assets' });
  await fastify.register(platformRoutes, { prefix: '/api/platforms' });
  await fastify.register(historyRoutes, { prefix: '/api/history' });
  await fastify.register(positionRoutes, { prefix: '/api/positions' });
  await fastify.register(alertRoutes, { prefix: '/api/alerts' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });
}

