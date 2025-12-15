import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { RegisterSchema, LoginSchema, UserDocument, SafeUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'apr-finder-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Helper to create safe user (without password)
function toSafeUser(user: UserDocument): SafeUser {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

// Helper to generate JWT token
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  const db = getDatabase();
  const usersCollection = db.collection<UserDocument>('users');

  // Create indexes
  await usersCollection.createIndex({ email: 1 }, { unique: true });

  /**
   * POST /api/auth/register
   * Register a new user
   */
  fastify.post('/register', async (
    request: FastifyRequest<{ Body: { email: string; password: string; name?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate input
      const validationResult = RegisterSchema.safeParse(request.body);
      if (!validationResult.success) {
        reply.code(400);
        return {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        };
      }

      const { email, password, name } = validationResult.data;

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        reply.code(409);
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const now = new Date();
      const result = await usersCollection.insertOne({
        email: email.toLowerCase(),
        passwordHash,
        name,
        createdAt: now,
        updatedAt: now,
      } as any);

      const user: UserDocument = {
        _id: result.insertedId.toString(),
        email: email.toLowerCase(),
        passwordHash,
        name,
        createdAt: now,
        updatedAt: now,
      };

      // Generate token
      const token = generateToken(user._id);

      return {
        success: true,
        data: {
          user: toSafeUser(user),
          token,
        },
      };
    } catch (error: any) {
      console.error('Register error:', error);
      reply.code(500);
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  });

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  fastify.post('/login', async (
    request: FastifyRequest<{ Body: { email: string; password: string } }>,
    reply: FastifyReply
  ) => {
    try {
      // Validate input
      const validationResult = LoginSchema.safeParse(request.body);
      if (!validationResult.success) {
        reply.code(400);
        return {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        };
      }

      const { email, password } = validationResult.data;

      // Find user
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Generate token
      const token = generateToken(user._id.toString());

      return {
        success: true,
        data: {
          user: toSafeUser({ ...user, _id: user._id.toString() }),
          token,
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      reply.code(500);
      return {
        success: false,
        error: 'Login failed',
      };
    }
  });

  /**
   * GET /api/auth/me
   * Get current user (requires auth token)
   */
  fastify.get('/me', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      // Get token from header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401);
        return {
          success: false,
          error: 'No token provided',
        };
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid or expired token',
        };
      }

      // Find user
      const { ObjectId } = await import('mongodb');
      const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) as any });
      
      if (!user) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          user: toSafeUser({ ...user, _id: user._id.toString() }),
        },
      };
    } catch (error: any) {
      console.error('Get me error:', error);
      reply.code(500);
      return {
        success: false,
        error: 'Failed to get user',
      };
    }
  });
}



