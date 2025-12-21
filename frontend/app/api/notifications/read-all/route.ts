import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    await db.collection('notifications').updateMany(
      { userId: auth.userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
  }
}

