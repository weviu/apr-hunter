import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getAuthFromRequest } from '@/lib/server/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateAlertSchema = z.object({
  asset: z.string().min(1).max(20),
  platform: z.string().min(1).max(50),
  alertType: z.enum(['above', 'below']),
  threshold: z.number().min(0).max(10000),
});

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = auth.userId;

    const alerts = await db
      .collection('alerts')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      alerts: alerts.map((alert) => ({
        id: alert._id,
        asset: alert.asset,
        platform: alert.platform,
        alertType: alert.alertType,
        threshold: alert.threshold,
        isActive: alert.isActive,
        lastTriggered: alert.lastTriggered,
        createdAt: alert.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = auth.userId;

    const body = await req.json().catch(() => null);
    const validation = CreateAlertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { asset, platform, alertType, threshold } = validation.data;

    const existingAlert = await db.collection('alerts').findOne({
      userId,
      asset: asset.toUpperCase(),
      platform,
      alertType,
    });

    if (existingAlert) {
      return NextResponse.json(
        {
          success: false,
          error: `You already have an alert for ${asset} on ${platform} when APR goes ${alertType} ${existingAlert.threshold}%`,
        },
        { status: 400 }
      );
    }

    const alertCount = await db.collection('alerts').countDocuments({ userId });
    if (alertCount >= 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum alert limit reached (50 alerts)' },
        { status: 400 }
      );
    }

    const alert = {
      userId,
      asset: asset.toUpperCase(),
      platform,
      alertType,
      threshold,
      isActive: true,
      lastTriggered: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('alerts').insertOne(alert);

    return NextResponse.json(
      {
        success: true,
        alert: {
          id: result.insertedId,
          asset: alert.asset,
          platform: alert.platform,
          alertType: alert.alertType,
          threshold: alert.threshold,
          isActive: alert.isActive,
          createdAt: alert.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ success: false, error: 'Failed to create alert' }, { status: 500 });
  }
}

