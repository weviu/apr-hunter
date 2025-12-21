import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type User = z.infer<typeof UserSchema>;

export interface UserDocument extends Omit<User, 'password'> {
  _id: string;
  passwordHash: string;
}

export interface SafeUser {
  _id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

