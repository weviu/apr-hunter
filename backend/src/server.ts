import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { connectToDatabase } from './config/database';
import { registerRoutes } from './routes';
import { scheduler } from './services/scheduler';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

async function start() {
  try {
    // Register plugins
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    await fastify.register(cors, {
      origin: allowedOrigins,
      credentials: true,
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Adjust for development
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Connect to MongoDB
    await connectToDatabase();

    // Start data collection scheduler (runs every 30 seconds)
    if (process.env.ENABLE_DATA_COLLECTION !== 'false') {
      scheduler.startDataCollection();
      // Run initial data collection
      const { dataCollector } = await import('./services/dataCollector');
      dataCollector.collectAll().catch((err) => {
        fastify.log.warn('Initial data collection failed:', err);
      });
    }

    // Register routes
    await registerRoutes(fastify);

    // Root route - API information
    fastify.get('/', async () => {
      return {
        name: 'APR Finder API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          apr: {
            list: 'GET /api/apr',
            byAsset: 'GET /api/apr/asset/:asset',
            compare: 'POST /api/apr/compare',
            top: 'GET /api/apr/top',
          },
          assets: {
            list: 'GET /api/assets',
            bySymbol: 'GET /api/assets/:symbol',
          },
          platforms: {
            list: 'GET /api/platforms',
            byName: 'GET /api/platforms/:platform',
          },
        },
        timestamp: new Date().toISOString(),
      };
    });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

