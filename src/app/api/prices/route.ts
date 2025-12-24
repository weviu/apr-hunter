import { NextResponse } from 'next/server';
import { getPrices } from '@/lib/prices/coin-gecko';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { symbols?: string[] };
    const symbols = Array.isArray(body?.symbols) ? body.symbols.map((s) => s.toUpperCase()) : [];
    const prices = await getPrices(symbols);
    return NextResponse.json({ success: true, prices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch prices' }, { status: 500 });
  }
}

