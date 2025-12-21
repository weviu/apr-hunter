import jwt from 'jsonwebtoken';
import { runtimeEnv } from './env';

export interface AuthPayload {
  userId: string;
  email?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, runtimeEnv.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, runtimeEnv.JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

