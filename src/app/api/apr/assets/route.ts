import { NextResponse } from 'next/server';
import { listSupportedAssets } from '@/lib/exchanges/registry';

export async function GET() {
  try {
    const assets = await listSupportedAssets();
    return NextResponse.json({ data: assets });
  } catch (error) {
    console.error('APR assets error', error);
    return NextResponse.json({ error: 'Unable to list assets' }, { status: 500 });
  }
}
