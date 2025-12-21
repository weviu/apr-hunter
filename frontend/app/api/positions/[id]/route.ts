import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';
import { UpdatePositionSchema } from '@/lib/server/models/Position';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const positionId = params.id;
    if (!ObjectId.isValid(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const validation = UpdatePositionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = await getDb();
    const updateData = {
      ...validation.data,
      updatedAt: new Date(),
    };

    const result = await db.collection('positions').findOneAndUpdate(
      { _id: new ObjectId(positionId), userId: auth.userId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Position updated successfully',
      position: result,
    });
  } catch (error) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = getAuthFromRequest(_req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const positionId = params.id;
    if (!ObjectId.isValid(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('positions').findOneAndUpdate(
      { _id: new ObjectId(positionId), userId: auth.userId },
      { $set: { status: 'closed', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Position closed successfully',
      position: result,
    });
  } catch (error) {
    console.error('Error closing position:', error);
    return NextResponse.json({ error: 'Failed to close position' }, { status: 500 });
  }
}

