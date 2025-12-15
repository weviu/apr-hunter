import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../config/database';

export async function historyRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const historyCollection = db.collection('apr_history');

  // Get historical APR data for an asset
  fastify.get('/asset/:asset', async (
    request: FastifyRequest<{
      Params: { asset: string };
      Querystring: {
        platform?: string;
        chain?: string;
        days?: string;
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { asset } = request.params;
      const { platform, chain, days = '30', limit = '100' } = request.query;

      const query: any = { asset: asset.toUpperCase() };
      if (platform) query.platform = { $regex: platform, $options: 'i' };
      if (chain) query.chain = chain.toLowerCase();

      // Filter by days
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
      query.timestamp = { $gte: daysAgo };

      const results = await historyCollection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit, 10))
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
        error: 'Failed to fetch historical data',
      };
    }
  });

  // Get APR trends (aggregated by day)
  fastify.get('/trends/:asset', async (
    request: FastifyRequest<{
      Params: { asset: string };
      Querystring: {
        platform?: string;
        chain?: string;
        days?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { asset } = request.params;
      const { platform, chain, days = '30' } = request.query;

      const query: any = { asset: asset.toUpperCase() };
      if (platform) query.platform = { $regex: platform, $options: 'i' };
      if (chain) query.chain = chain.toLowerCase();

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
      query.timestamp = { $gte: daysAgo };

      // Aggregate by day
      const trends = await historyCollection
        .aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' },
                platform: '$platform',
                chain: '$chain',
              },
              avgApr: { $avg: '$apr' },
              maxApr: { $max: '$apr' },
              minApr: { $min: '$apr' },
              count: { $sum: 1 },
              date: { $first: '$timestamp' },
            },
          },
          { $sort: { date: 1 } },
        ])
        .toArray();

      return {
        success: true,
        data: trends,
        count: trends.length,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to fetch trend data',
      };
    }
  });
}

