import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/server/db';
import { LoginSchema, UserDocument, SafeUser } from '@/lib/server/models/User';
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
    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>('users');

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = signToken(user._id.toString());

    return NextResponse.json({
      success: true,
      data: {
        user: toSafeUser({ ...user, _id: user._id.toString() }),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
      },
      { status: 500 }
    );
  }
}

