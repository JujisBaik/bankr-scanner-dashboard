import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getLatestResults, saveResults, ScanResult } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_RESULTS_URL =
  process.env.RESULTS_FALLBACK_URL ||
  'https://raw.githubusercontent.com/JujisBaik/bankr-scanner-dashboard/main/data/latest.json';

async function getFallbackResults(): Promise<ScanResult | null> {
  try {
    const response = await fetch(`${FALLBACK_RESULTS_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!response.ok) return null;
    return (await response.json()) as ScanResult;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'history') {
    const history = await getHistory();
    return NextResponse.json({
      count: history.length,
      results: history,
    });
  }

  const latest = await getLatestResults();
  if (latest) {
    return NextResponse.json(latest);
  }

  const fallback = await getFallbackResults();
  if (fallback) {
    return NextResponse.json(fallback);
  }

  return NextResponse.json(
    {
      error: 'No scan results yet',
      hint: 'Results appear after the first VPS push and GitHub persistence update',
      status: 'waiting',
    },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.SCAN_API_KEY;

  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const result: ScanResult = {
      id: `scan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: body.model || 'mimo-v2-pro',
      generatedAt: body.generatedAt,
      scanner: body.scanner,
      summary: body.summary,
      tokens: body.tokens,
    };

    await saveResults(result);

    return NextResponse.json({
      success: true,
      id: result.id,
      timestamp: result.timestamp,
      tokenCount: result.tokens.length,
      summary: result.summary,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
