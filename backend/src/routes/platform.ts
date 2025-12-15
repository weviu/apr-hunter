import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../config/database';
import { AprDataDocument } from '../models/AprData';

export async function platformRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const aprCollection = db.collection<AprDataDocument>('apr_data');

  // Get all platforms
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const platforms = await aprCollection.distinct('platform');
      const platformTypes = await aprCollection.distinct('platformType');

      // Get platform statistics
      const platformStats = await aprCollection.aggregate([
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            avgApr: { $avg: '$apr' },
            maxApr: { $max: '$apr' },
            minApr: { $min: '$apr' },
            platformType: { $first: '$platformType' },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]).toArray();

      return {
        success: true,
        data: {
          platforms,
          platformTypes,
          statistics: platformStats,
        },
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to fetch platforms',
      };
    }
  });

  // Get APR data for a specific platform
  fastify.get('/:platform', async (
    request: FastifyRequest<{ Params: { platform: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { platform } = request.params;
      const results = await aprCollection
        .find({ platform: { $regex: platform, $options: 'i' } })
        .sort({ apr: -1 })
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
        error: 'Failed to fetch platform data',
      };
    }
  });
}

