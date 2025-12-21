import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const result = await db.collection('notifications').deleteMany({ userId: auth.userId, read: true });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json({ success: false, error: 'Failed to clear notifications' }, { status: 500 });
  }
}

