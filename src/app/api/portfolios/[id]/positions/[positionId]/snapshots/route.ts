import { getMongoDb } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/portfolios/[id]/positions/[positionId]/snapshots
// Fetch position snapshots to view history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; positionId: string }> }
) {
  try {
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database connection failed' }, { status: 500 });
    }
    const { id: portfolioId, positionId } = await params;

    // Get user from session (via header)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ sessionToken: token });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
    }

    // Verify portfolio ownership
    const portfoliosCollection = db.collection('portfolios');
    const portfolio = await portfoliosCollection.findOne({
      _id: new ObjectId(portfolioId),
      userId: user._id,
    });

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Fetch snapshots for the position
    const snapshotsCollection = db.collection('position_snapshots');
    const snapshots = await snapshotsCollection
      .find({
        positionId: new ObjectId(positionId),
        portfolioId: new ObjectId(portfolioId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: { snapshots },
    });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
