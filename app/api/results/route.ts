// app/api/results/route.ts — GET latest results, POST new results from VPS
import { NextRequest, NextResponse } from 'next/server';
import { saveResults, getLatestResults, getHistory, ScanResult } from '@/lib/storage';

// Force dynamic rendering (no caching of API routes)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/results — return latest scan results
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');

  if (mode === 'history') {
    const history = await getHistory();
    return NextResponse.json({ 
      count: history.length,
      results: history 
    });
  }

  const latest = await getLatestResults();
  if (!latest) {
    return NextResponse.json({ 
      error: 'No scan results yet',
      hint: 'Results appear after the first VPS push (every 10 min)',
      status: 'waiting'
    }, { status: 404 });
  }
  return NextResponse.json(latest);
}

// POST /api/results — VPS pushes new scan results
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
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
