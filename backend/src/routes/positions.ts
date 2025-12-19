import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { CreatePositionSchema, UpdatePositionSchema, PositionDocument } from '../models/Position';
import { fetchAssetPrices } from '../services/priceService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Auth middleware
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    (request as any).user = decoded;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

export async function positionRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  async function enrichPositionWithApr(db: any, position: any) {
    const aprData = await db.collection('apr_data').findOne({
      platform: { $regex: new RegExp(`^${position.platform}$`, 'i') },
      asset: { $regex: new RegExp(`^${position.asset}$`, 'i') },
    });

    if (aprData) {
      position.currentApr = aprData.apr;
      position.aprSource = aprData.source || aprData.platform;
      position.aprLastUpdated = aprData.lastUpdated || new Date();
    }
    return position;
  }

  // GET /api/positions - Get all positions for the authenticated user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      
      const positions = await db
        .collection('positions')
        .find({ userId, status: 'active' })
        .sort({ createdAt: -1 })
        .toArray();

      // Attach latest APR/source info
      const enriched = [];
      for (const pos of positions) {
        enriched.push(await enrichPositionWithApr(db, pos));
      }
      
      return reply.send(enriched);
    } catch (error) {
      console.error('Error fetching positions:', error);
      return reply.status(500).send({ error: 'Failed to fetch positions' });
    }
  });

  // GET /api/positions/stats - Get portfolio stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      
      const positionsRaw = await db
        .collection('positions')
        .find({ userId, status: 'active' })
        .toArray();

      const positions: PositionDocument[] = positionsRaw.map((pos) => ({
        ...(pos as any),
        _id: pos._id?.toString?.() ?? String(pos._id),
      }));

      const assets = Array.from(new Set(positions.map((p) => p.asset.toUpperCase())));
      const priceMap = await fetchAssetPrices(assets);

      for (const pos of positions) {
        const price = priceMap[pos.asset.toUpperCase()];
        if (price) {
          pos.currentPrice = price;
        }
      }

      // Attach latest APR/source info
      for (const pos of positions) {
        await enrichPositionWithApr(db, pos);
      }
      
      // Calculate stats
      let totalValue = 0;
      let totalEarnings = 0;
      
      for (const position of positions) {
        const currentPrice = position.currentPrice || position.entryPrice || 0;
        const positionValue = position.amount * currentPrice;
        totalValue += positionValue;
        
        // Estimate earnings based on APR (simplified - assumes 30 days)
        const apr = position.currentApr || position.entryApr;
        const dailyRate = apr / 100 / 365;
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        totalEarnings += positionValue * dailyRate * daysSinceCreation;
      }
      
      return reply.send({
        totalValue: Math.round(totalValue * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        positionCount: positions.length,
        positions: positions.map(p => ({
          ...p,
          currentValue: (p.currentPrice || p.entryPrice || 0) * p.amount
        }))
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // POST /api/positions - Create a new position
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      
      const validation = CreatePositionSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: validation.error.errors 
        });
      }
      
      const { platform, asset, amount, entryApr, entryPrice, notes } = validation.data;
      
      // Try to get current APR from our data
      const aprData = await db.collection('apr_data').findOne({
        platform: { $regex: new RegExp(platform, 'i') },
        asset: { $regex: new RegExp(asset, 'i') }
      });
      
      const position = {
        userId,
        platform,
        asset: asset.toUpperCase(),
        amount,
        entryApr,
        currentApr: aprData?.apr || entryApr,
        entryPrice: entryPrice || null,
        currentPrice: entryPrice || null, // Would be updated by a price service
        status: 'active',
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await db.collection('positions').insertOne(position);
      
      return reply.status(201).send({
        message: 'Position created successfully',
        position: { ...position, _id: result.insertedId }
      });
    } catch (error) {
      console.error('Error creating position:', error);
      return reply.status(500).send({ error: 'Failed to create position' });
    }
  });

  // PUT /api/positions/:id - Update a position
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const positionId = request.params.id;
      
      if (!ObjectId.isValid(positionId)) {
        return reply.status(400).send({ error: 'Invalid position ID' });
      }
      
      const validation = UpdatePositionSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: validation.error.errors 
        });
      }
      
      const updateData = {
        ...validation.data,
        updatedAt: new Date(),
      };
      
      const result = await db.collection('positions').findOneAndUpdate(
        { _id: new ObjectId(positionId), userId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return reply.status(404).send({ error: 'Position not found' });
      }
      
      return reply.send({
        message: 'Position updated successfully',
        position: result
      });
    } catch (error) {
      console.error('Error updating position:', error);
      return reply.status(500).send({ error: 'Failed to update position' });
    }
  });

  // DELETE /api/positions/:id - Close/delete a position
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const positionId = request.params.id;
      
      if (!ObjectId.isValid(positionId)) {
        return reply.status(400).send({ error: 'Invalid position ID' });
      }
      
      // Soft delete - mark as closed
      const result = await db.collection('positions').findOneAndUpdate(
        { _id: new ObjectId(positionId), userId },
        { $set: { status: 'closed', updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return reply.status(404).send({ error: 'Position not found' });
      }
      
      return reply.send({
        message: 'Position closed successfully',
        position: result
      });
    } catch (error) {
      console.error('Error closing position:', error);
      return reply.status(500).send({ error: 'Failed to close position' });
    }
  });
}


