import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../config/database';
import { AprDataDocument } from '../models/AprData';

export async function aprRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const aprCollection = db.collection<AprDataDocument>('apr_data');

  // Get all APR data with optional filters
  fastify.get('/', async (request: FastifyRequest<{
    Querystring: {
      asset?: string;
      platform?: string;
      chain?: string;
      platformType?: 'exchange' | 'defi';
      minApr?: string;
      maxApr?: string;
      sortBy?: 'apr' | 'lastUpdated';
      order?: 'asc' | 'desc';
      limit?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const {
        asset,
        platform,
        chain,
        platformType,
        minApr,
        maxApr,
        sortBy = 'apr',
        order = 'desc',
        limit = '100',
      } = request.query;

      const query: any = {};

      if (asset) query.asset = asset.toUpperCase();
      if (platform) query.platform = { $regex: platform, $options: 'i' };
      if (chain) query.chain = chain.toLowerCase();
      if (platformType) query.platformType = platformType;

      if (minApr || maxApr) {
        query.apr = {};
        if (minApr) query.apr.$gte = parseFloat(minApr);
        if (maxApr) query.apr.$lte = parseFloat(maxApr);
      }

      const sort: any = {};
      sort[sortBy] = order === 'asc' ? 1 : -1;

      const results = await aprCollection
        .find(query)
        .sort(sort)
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
        error: 'Failed to fetch APR data',
      };
    }
  });

  // Get APR data for a specific asset
  fastify.get('/asset/:asset', async (
    request: FastifyRequest<{
      Params: { asset: string };
      Querystring: { includeHistory?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { asset } = request.params;
      const { includeHistory } = request.query;
      const results = await aprCollection
        .find({ asset: asset.toUpperCase() })
        .sort({ apr: -1 })
        .toArray();

      let history = null;
      if (includeHistory === 'true') {
        const historyCollection = db.collection('apr_history');
        const historyData = await historyCollection
          .find({ asset: asset.toUpperCase() })
          .sort({ timestamp: -1 })
          .limit(10)
          .toArray();
        history = historyData;
      }

      return {
        success: true,
        data: results,
        count: results.length,
        ...(history && { history }),
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to fetch APR data for asset',
      };
    }
  });

  // Get APR comparison for multiple assets
  fastify.post('/compare', async (
    request: FastifyRequest<{ Body: { assets: string[]; chain?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { assets, chain } = request.body;

      if (!assets || !Array.isArray(assets) || assets.length === 0) {
        reply.code(400);
        return {
          success: false,
          error: 'Assets array is required',
        };
      }

      const query: any = {
        asset: { $in: assets.map((a) => a.toUpperCase()) },
      };

      if (chain) {
        query.chain = chain.toLowerCase();
      }

      const results = await aprCollection
        .find(query)
        .sort({ asset: 1, apr: -1 })
        .toArray();

      // Group by asset
      const grouped = results.reduce((acc, item) => {
        if (!acc[item.asset]) {
          acc[item.asset] = [];
        }
        acc[item.asset].push(item);
        return acc;
      }, {} as Record<string, AprDataDocument[]>);

      return {
        success: true,
        data: grouped,
        count: results.length,
      };
    } catch (error) {
      reply.code(500);
      return {
        success: false,
        error: 'Failed to compare APR data',
      };
    }
  });

  // Get highest APR opportunities
  fastify.get('/top', async (request: FastifyRequest<{
    Querystring: {
      limit?: string;
      chain?: string;
      platformType?: 'exchange' | 'defi';
    };
  }>, reply: FastifyReply) => {
    try {
      const { limit = '10', chain, platformType } = request.query;

      const query: any = {};
      if (chain) query.chain = chain.toLowerCase();
      if (platformType) query.platformType = platformType;

      const results = await aprCollection
        .find(query)
        .sort({ apr: -1 })
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
        error: 'Failed to fetch top APR opportunities',
      };
    }
  });
}

