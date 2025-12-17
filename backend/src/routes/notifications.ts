import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';

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

export async function notificationRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // GET /api/notifications - Get all notifications for the authenticated user
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { limit?: string; unread?: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const limit = Math.min(parseInt(request.query.limit || '50'), 100);
      const unreadOnly = request.query.unread === 'true';

      const query: any = { userId };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await db
        .collection('notifications')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      const unreadCount = await db.collection('notifications').countDocuments({ userId, read: false });

      return reply.send({
        success: true,
        notifications: notifications.map((n) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          read: n.read,
          createdAt: n.createdAt,
        })),
        unreadCount,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch notifications' });
    }
  });

  // GET /api/notifications/unread-count - Get unread count only
  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const unreadCount = await db.collection('notifications').countDocuments({ userId, read: false });

      return reply.send({ success: true, unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch unread count' });
    }
  });

  // PUT /api/notifications/:id/read - Mark a notification as read
  fastify.put('/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const notificationId = request.params.id;

      if (!ObjectId.isValid(notificationId)) {
        return reply.status(400).send({ success: false, error: 'Invalid notification ID' });
      }

      const result = await db.collection('notifications').findOneAndUpdate(
        { _id: new ObjectId(notificationId), userId },
        { $set: { read: true } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Notification not found' });
      }

      return reply.send({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return reply.status(500).send({ success: false, error: 'Failed to update notification' });
    }
  });

  // PUT /api/notifications/read-all - Mark all notifications as read
  fastify.put('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;

      await db.collection('notifications').updateMany(
        { userId, read: false },
        { $set: { read: true } }
      );

      return reply.send({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return reply.status(500).send({ success: false, error: 'Failed to update notifications' });
    }
  });

  // DELETE /api/notifications/:id - Delete a notification
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;
      const notificationId = request.params.id;

      if (!ObjectId.isValid(notificationId)) {
        return reply.status(400).send({ success: false, error: 'Invalid notification ID' });
      }

      const result = await db.collection('notifications').findOneAndDelete({
        _id: new ObjectId(notificationId),
        userId,
      });

      if (!result) {
        return reply.status(404).send({ success: false, error: 'Notification not found' });
      }

      return reply.send({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return reply.status(500).send({ success: false, error: 'Failed to delete notification' });
    }
  });

  // DELETE /api/notifications/clear-read - Delete all read notifications
  fastify.delete('/clear-read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getDatabase();
      const userId = (request as any).user.userId;

      const result = await db.collection('notifications').deleteMany({ userId, read: true });

      return reply.send({
        success: true,
        message: `Deleted ${result.deletedCount} notifications`,
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return reply.status(500).send({ success: false, error: 'Failed to clear notifications' });
    }
  });
}
