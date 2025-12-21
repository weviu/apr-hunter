import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = auth.userId;
    const unreadCount = await db.collection('notifications').countDocuments({ userId, read: false });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unread count' }, { status: 500 });
  }
}

