import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    if (!ObjectId.isValid(notificationId)) {
      return NextResponse.json({ success: false, error: 'Invalid notification ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('notifications').findOneAndDelete({
      _id: new ObjectId(notificationId),
      userId: auth.userId,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 });
  }
}

