import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateAlertSchema = z.object({
  alertType: z.enum(['above', 'below']).optional(),
  threshold: z.number().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const alertId = params.id;
    if (!ObjectId.isValid(alertId)) {
      return NextResponse.json({ success: false, error: 'Invalid alert ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const validation = UpdateAlertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const db = await getDb();
    const updateData = {
      ...validation.data,
      updatedAt: new Date(),
    };

    const result = await db.collection('alerts').findOneAndUpdate(
      { _id: new ObjectId(alertId), userId: auth.userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alert: {
        id: result._id,
        asset: result.asset,
        platform: result.platform,
        alertType: result.alertType,
        threshold: result.threshold,
        isActive: result.isActive,
        lastTriggered: result.lastTriggered,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const alertId = params.id;
    if (!ObjectId.isValid(alertId)) {
      return NextResponse.json({ success: false, error: 'Invalid alert ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('alerts').findOneAndDelete({
      _id: new ObjectId(alertId),
      userId: auth.userId,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete alert' }, { status: 500 });
  }
}

