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
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const unreadOnly = url.searchParams.get('unread') === 'true';

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

    return NextResponse.json({
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
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

