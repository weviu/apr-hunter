import { NextRequest, NextResponse } from 'next/server';
import { fetchAllAprOpportunities } from '@/lib/exchanges/registry';
import { saveAprSnapshots, appendAprHistory } from '@/lib/db/repositories/aprRepository';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fetchedAt = new Date().toISOString();
    
    // Fetch fresh data from all exchanges
    const aprData = await fetchAllAprOpportunities();

    if (!aprData || aprData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No APR data fetched',
        timestamp: fetchedAt,
      }, { status: 200 });
    }

    // Save snapshots to database
    await saveAprSnapshots(aprData, fetchedAt);

    // Append to history for trend calculation
    await appendAprHistory(aprData, fetchedAt);

    return NextResponse.json({
      success: true,
      message: 'APR data refreshed successfully',
      count: aprData.length,
      timestamp: fetchedAt,
    });
  } catch (error) {
    console.error('APR refresh cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow POST for convenience
  return GET(request);
}
