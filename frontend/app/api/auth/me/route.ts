import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/server/db';
import { SafeUser, UserDocument } from '@/lib/server/models/User';
import { getAuthFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

function toSafeUser(user: UserDocument): SafeUser {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const decoded = getAuthFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<UserDocument>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) as any });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: toSafeUser({ ...user, _id: user._id.toString() }),
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

