import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../config/database';
import { AssetDocument } from '../models/Asset';

export async function assetRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const assetCollection = db.collection<AssetDocument>('assets');

  // Get all assets
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const results = await assetCollection
        .find({})
        .sort({ marketCap: -1 })
        .toArray();

      return {
        success: true,
        data: results,
        count: results.length,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to fetch assets',
      };
    }
  });

  // Get asset by symbol
  fastify.get('/:symbol', async (
    request: FastifyRequest<{ Params: { symbol: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { symbol } = request.params;
      const asset = await assetCollection.findOne({
        symbol: symbol.toUpperCase(),
      });

      if (!asset) {
        reply.code(404);
        return {
          success: false,
          error: 'Asset not found',
        };
      }

      return {
        success: true,
        data: asset,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to fetch asset',
      };
    }
  });
}

