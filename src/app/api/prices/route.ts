import { NextResponse } from 'next/server';
import { getPrices } from '@/lib/prices/coin-gecko';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { symbols?: string[] };
    const symbols = Array.isArray(body?.symbols) ? body.symbols.map((s) => s.toUpperCase()) : [];
    const prices = await getPrices(symbols);
    return NextResponse.json({ success: true, prices });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch prices';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

