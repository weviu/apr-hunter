import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/server/db';
import { RegisterSchema, UserDocument, SafeUser } from '@/lib/server/models/User';
import { signToken } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

function toSafeUser(user: UserDocument): SafeUser {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    console.log('[Register] Incoming payload', body ? { ...body, password: body.password ? '[redacted]' : undefined } : body);
    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      console.warn('[Register] Validation failed', validationResult.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validationResult.data;
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });

    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
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

    const token = signToken(user._id);

    return NextResponse.json({
      success: true,
      data: {
        user: toSafeUser(user),
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Registration failed',
      },
      { status: 500 }
    );
  }
}

