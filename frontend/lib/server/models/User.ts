import { z } from 'zod';

const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().email('Invalid email address')
);

export const UserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
  name: z.string().min(2).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const optionalNameSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(2, 'Name must be at least 2 characters').optional()
);

export const RegisterSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: optionalNameSchema,
});

export const LoginSchema = z.object({
  email: emailSchema,
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

