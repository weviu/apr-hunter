import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { z } from 'zod';

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

const CreateAlertSchema = z.object({
  asset: z.string().min(1).max(20),
  platform: z.string().min(1).max(50),
  alertType: z.enum(['above', 'below']),
  threshold: z.number().min(0).max(10000),
});

const UpdateAlertSchema = z.object({
  alertType: z.enum(['above', 'below']).optional(),
  threshold: z.number().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export async function alertRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/alerts - Get all alerts for the authenticated user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      
      const alerts = await db
        .collection('alerts')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      return reply.send({
        success: true,
        alerts: alerts.map((alert) => ({
          id: alert._id,
          asset: alert.asset,
          platform: alert.platform,
          alertType: alert.alertType,
          threshold: alert.threshold,
          isActive: alert.isActive,
          lastTriggered: alert.lastTriggered,
          createdAt: alert.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch alerts' });
    }
  });

  // POST /api/alerts - Create a new alert
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      
      const validation = CreateAlertSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, error: validation.error.errors });
      }

      const { asset, platform, alertType, threshold } = validation.data;

      // Check if user already has an alert for this asset/platform/type combination
      const existingAlert = await db.collection('alerts').findOne({
        userId,
        asset: asset.toUpperCase(),
        platform,
        alertType,
      });

      if (existingAlert) {
        return reply.status(400).send({
          success: false,
          error: `You already have an alert for ${asset} on ${platform} when APR goes ${alertType} ${existingAlert.threshold}%`,
        });
      }

      // Limit alerts per user
      const alertCount = await db.collection('alerts').countDocuments({ userId });
      if (alertCount >= 50) {
        return reply.status(400).send({
          success: false,
          error: 'Maximum alert limit reached (50 alerts)',
        });
      }

      const alert = {
        userId,
        asset: asset.toUpperCase(),
        platform,
        alertType,
        threshold,
        isActive: true,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('alerts').insertOne(alert);

      return reply.status(201).send({
        success: true,
        alert: {
          id: result.insertedId,
          asset: alert.asset,
          platform: alert.platform,
          alertType: alert.alertType,
          threshold: alert.threshold,
          isActive: alert.isActive,
          createdAt: alert.createdAt,
        },
      });
    } catch (error) {
      console.error('Error creating alert:', error);
      return reply.status(500).send({ success: false, error: 'Failed to create alert' });
    }
  });

  // PUT /api/alerts/:id - Update an alert
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const alertId = request.params.id;

      if (!ObjectId.isValid(alertId)) {
        return reply.status(400).send({ success: false, error: 'Invalid alert ID' });
      }

      const validation = UpdateAlertSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, error: validation.error.errors });
      }

      const updateData = {
        ...validation.data,
        updatedAt: new Date(),
      };

      const result = await db.collection('alerts').findOneAndUpdate(
        { _id: new ObjectId(alertId), userId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Alert not found' });
      }

      return reply.send({
        success: true,
        alert: {
          id: result._id,
          asset: result.asset,
          platform: result.platform,
          alertType: result.alertType,
          threshold: result.threshold,
          isActive: result.isActive,
          lastTriggered: result.lastTriggered,
          createdAt: result.createdAt,
        },
      });
    } catch (error) {
      console.error('Error updating alert:', error);
      return reply.status(500).send({ success: false, error: 'Failed to update alert' });
    }
  });

  // DELETE /api/alerts/:id - Delete an alert
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const alertId = request.params.id;

      if (!ObjectId.isValid(alertId)) {
        return reply.status(400).send({ success: false, error: 'Invalid alert ID' });
      }

      const result = await db.collection('alerts').findOneAndDelete({
        _id: new ObjectId(alertId),
        userId,
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Alert not found' });
      }

      return reply.send({ success: true, message: 'Alert deleted' });
    } catch (error) {
      console.error('Error deleting alert:', error);
      return reply.status(500).send({ success: false, error: 'Failed to delete alert' });
    }
  });
}
